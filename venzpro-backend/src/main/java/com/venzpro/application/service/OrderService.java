package com.venzpro.application.service;

import com.venzpro.application.dto.request.OrderItemRequest;
import com.venzpro.application.dto.request.OrderRequest;
import com.venzpro.application.dto.request.OrderStatusRequest;
import com.venzpro.application.dto.response.OrderResponse;
import com.venzpro.domain.entity.*;
import com.venzpro.domain.enums.CustomerStatus;
import com.venzpro.domain.enums.OrderStatus;
import com.venzpro.domain.enums.UserRole;
import com.venzpro.domain.repository.*;
import com.venzpro.infrastructure.exception.BusinessException;
import com.venzpro.infrastructure.exception.ResourceNotFoundException;
import com.venzpro.infrastructure.exception.TenantViolationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository              orderRepository;
    private final CustomerRepository           customerRepository;
    private final CompanyRepository            companyRepository;
    private final UserRepository               userRepository;
    private final OrganizationRepository       organizationRepository;
    private final ProductRepository            productRepository;
    private final OrderStatusHistoryRepository statusHistoryRepository;
    private final AuditService                 auditService;
    private final AgreementService             agreementService;

    // ── Mapa de transições válidas ─────────────────────────────────────────────
    //
    // CONCLUIDO e CANCELADO são status terminais: não admitem nenhuma transição.
    // Tentar cancelar um pedido CONCLUIDO lançará BusinessException.
    // Tentar cancelar um pedido APROVADO sem motivo também lançará BusinessException.
    //
    private static final Map<OrderStatus, Set<OrderStatus>> TRANSICOES_VALIDAS = Map.of(
        OrderStatus.ORCAMENTO, EnumSet.of(OrderStatus.ENVIADO,   OrderStatus.CANCELADO),
        OrderStatus.ENVIADO,   EnumSet.of(OrderStatus.APROVADO,  OrderStatus.REJEITADO, OrderStatus.CANCELADO),
        OrderStatus.APROVADO,  EnumSet.of(OrderStatus.CONCLUIDO, OrderStatus.CANCELADO),
        OrderStatus.REJEITADO, EnumSet.noneOf(OrderStatus.class),
        OrderStatus.CONCLUIDO, EnumSet.noneOf(OrderStatus.class),   // ← status terminal
        OrderStatus.CANCELADO, EnumSet.noneOf(OrderStatus.class)    // ← status terminal
    );

    // ── Criar pedido ───────────────────────────────────────────────────────────

    @Transactional
    public OrderResponse create(OrderRequest req, UUID userId, UUID organizationId) {
        var customer = buscarClientePorOrg(req.customerId(), organizationId);
        var user     = buscarUsuarioPorOrg(userId, organizationId);

        validarClienteParaPedido(customer, user);
        validarAcordoEmpresa(req.companyId(), organizationId);

        var company = buscarEmpresaPorOrg(req.companyId(), organizationId);
        var org     = buscarOrganizacao(organizationId);

        var order = Order.builder()
            .customer(customer)
            .company(company)
            .user(user)
            .descricao(req.descricao())
            .build();

        order.setOrganizationId(organizationId);
        order.setStatus(OrderStatus.ORCAMENTO);

        aplicarItens(order, req.items(), organizationId);

        var saved = orderRepository.save(order);

        auditService.log(organizationId, userId,
            AuditService.CREATE_ORDER, "Pedido", saved.getId(),
            "Cliente: " + customer.getNome());

        return OrderResponse.from(saved);
    }

    // ── Listar pedidos ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OrderResponse> findAll(UUID organizationId, UUID userId,
                                       UserRole role, OrderStatus status) {
        List<Order> list = (role == UserRole.VENDEDOR)
            ? (status != null
                ? orderRepository.findAllByOrganizationIdAndStatusAndUserIdAndDeletedAtIsNull(organizationId, status, userId)
                : orderRepository.findAllByOrganizationIdAndUserIdAndDeletedAtIsNull(organizationId, userId))
            : (status != null
                ? orderRepository.findAllByOrganizationIdAndStatusAndDeletedAtIsNull(organizationId, status)
                : orderRepository.findAllByOrganizationIdAndDeletedAtIsNull(organizationId));

        return list.stream().map(OrderResponse::from).toList();
    }

    // ── Buscar por ID ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public OrderResponse findById(UUID id, UUID organizationId, UUID userId, UserRole role) {
        var order = buscarPedidoPorOrg(id, organizationId);
        validarOwnerPedido(order, userId, role);
        return OrderResponse.from(order);
    }

    // ── Editar pedido ──────────────────────────────────────────────────────────

    @Transactional
    public OrderResponse update(UUID id, OrderRequest req, UUID userId,
                                UUID organizationId, UserRole role) {
        var order = buscarPedidoPorOrg(id, organizationId);
        validarOwnerPedido(order, userId, role);

        if (order.getStatus() != OrderStatus.ORCAMENTO) {
            auditService.logError(organizationId, userId, AuditService.UPDATE_ORDER,
                "Edição negada — pedido " + id + " em status " + order.getStatus());
            throw new BusinessException(
                "Somente pedidos em ORÇAMENTO podem ser editados. " +
                "Status atual: " + order.getStatus() + ".");
        }

        var customer = buscarClientePorOrg(req.customerId(), organizationId);
        var user     = buscarUsuarioPorOrg(userId, organizationId);

        validarClienteParaPedido(customer, user);
        validarAcordoEmpresa(req.companyId(), organizationId);

        var company = buscarEmpresaPorOrg(req.companyId(), organizationId);

        order.setCustomer(customer);
        order.setCompany(company);
        order.setDescricao(req.descricao());
        aplicarItens(order, req.items(), organizationId);

        auditService.log(organizationId, userId,
            AuditService.UPDATE_ORDER, "Pedido", id,
            "Cliente: " + customer.getNome());

        return OrderResponse.from(orderRepository.save(order));
    }

    // ── Atualizar status ───────────────────────────────────────────────────────

    @Transactional
    public OrderResponse updateStatus(UUID id, UUID userId, UUID organizationId,
                                      UserRole role, OrderStatusRequest req) {
        var order = buscarPedidoPorOrg(id, organizationId);
        validarOwnerPedido(order, userId, role);

        OrderStatus statusAtual = order.getStatus();
        OrderStatus novoStatus  = req.status();

        validarTransicaoStatus(statusAtual, novoStatus, req.motivo());

        var changedBy = buscarUsuarioPorOrg(userId, organizationId);

        if (novoStatus == OrderStatus.CANCELADO) {
            order.registrarCancelamento(changedBy, req.motivo());
        } else {
            order.setStatus(novoStatus);
        }

        var saved = orderRepository.save(order);

        statusHistoryRepository.save(
            OrderStatusHistory.builder()
                .order(saved)
                .oldStatus(statusAtual)
                .newStatus(novoStatus)
                .changedBy(changedBy)
                .motivo(req.motivo())
                .build()
        );

        auditService.log(organizationId, userId,
            AuditService.UPDATE_STATUS, "Pedido", id,
            statusAtual + " → " + novoStatus +
            (req.motivo() != null ? " | Motivo: " + req.motivo() : ""));

        return OrderResponse.from(saved);
    }

    // ── Excluir pedido (soft-delete) ───────────────────────────────────────────

    @Transactional
    public void delete(UUID id, UUID organizationId, UUID userId, UserRole role) {
        var order = buscarPedidoPorOrg(id, organizationId);
        validarOwnerPedido(order, userId, role);
        order.softDelete();
        orderRepository.save(order);
    }

    // ── Validações de negócio ─────────────────────────────────────────────────

    /**
     * Valida se a transição de status é permitida.
     *
     * Regras especiais:
     * <ul>
     *   <li>CONCLUIDO → qualquer coisa: sempre negado (status terminal)</li>
     *   <li>CANCELADO → qualquer coisa: sempre negado (status terminal)</li>
     *   <li>APROVADO  → CANCELADO: exige motivo preenchido</li>
     * </ul>
     */
    private void validarTransicaoStatus(OrderStatus atual, OrderStatus novo, String motivo) {
        // Status terminais: nunca permitem transição
        if (atual == OrderStatus.CONCLUIDO) {
            throw new BusinessException(
                "Pedidos CONCLUÍDOS não podem ser alterados. " +
                "Este é um status terminal — o pedido foi finalizado com sucesso.");
        }
        if (atual == OrderStatus.CANCELADO) {
            throw new BusinessException(
                "Pedidos CANCELADOS não podem ser alterados. " +
                "Este é um status terminal.");
        }
        if (atual == OrderStatus.REJEITADO) {
            throw new BusinessException(
                "Pedidos REJEITADOS não podem ser alterados. " +
                "Este é um status terminal.");
        }

        Set<OrderStatus> permitidos = TRANSICOES_VALIDAS.get(atual);
        if (permitidos == null || !permitidos.contains(novo)) {
            throw new BusinessException(
                "Transição inválida: " + atual + " → " + novo + ". " +
                "Transições permitidas a partir de " + atual + ": " +
                (permitidos == null || permitidos.isEmpty() ? "nenhuma" : permitidos));
        }

        // Cancelamento de pedido APROVADO exige justificativa
        if (novo == OrderStatus.CANCELADO && atual == OrderStatus.APROVADO) {
            if (motivo == null || motivo.isBlank()) {
                throw new BusinessException(
                    "O motivo é obrigatório ao cancelar um pedido já APROVADO.");
            }
        }
    }

    private void validarOwnerPedido(Order order, UUID userId, UserRole role) {
        if (role == UserRole.VENDEDOR && !order.getUser().getId().equals(userId)) {
            throw new TenantViolationException(
                "Você não tem permissão para acessar pedidos de outro vendedor.");
        }
    }

    private void validarClienteParaPedido(Customer customer, User user) {
        if (customer.getStatus() != CustomerStatus.APROVADO) {
            throw new BusinessException(
                "Cliente precisa estar APROVADO para gerar pedido. " +
                "Status atual: " + customer.getStatus() + ". " +
                "Solicite a aprovação ao gerente ou administrador.");
        }
        if (customer.getOwner() == null) {
            throw new BusinessException(
                "O cliente \"" + customer.getNome() + "\" não possui responsável atribuído. " +
                "Atribua um responsável antes de criar o pedido.");
        }
        if (user.getRole() == UserRole.VENDEDOR &&
            !customer.getOwner().getId().equals(user.getId())) {
            throw new TenantViolationException(
                "Você não pode criar pedidos para clientes de outro vendedor.");
        }
    }

    private void validarAcordoEmpresa(UUID companyId, UUID organizationId) {
        if (companyId != null && !agreementService.hasActiveAgreement(organizationId, companyId)) {
            throw new BusinessException(
                "Sua organização não possui um acordo ativo para vender " +
                "produtos desta empresa.");
        }
    }

    // ── Helpers de aplicação de itens ─────────────────────────────────────────

    private void aplicarItens(Order order, List<OrderItemRequest> items, UUID organizationId) {
        if (items == null || items.isEmpty()) {
            throw new BusinessException("O pedido deve conter ao menos um item.");
        }

        order.clearItens();

        for (OrderItemRequest req : items) {
            Product product = productRepository
                .findByIdAndOrganizationId(req.productId(), organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Produto", req.productId()));

            if (product.getPrecoBase() == null) {
                throw new BusinessException(
                    "Produto '" + product.getNome() + "' não possui preço definido.");
            }

            order.addItem(
                OrderItem.builder()
                    .product(product)
                    .quantidade(req.quantidade())
                    .precoUnitario(product.getPrecoBase()) // snapshot do preço
                    .build()
            );
        }

        order.recalcularTotal();
    }

    // ── Helpers de busca ──────────────────────────────────────────────────────

    private Order buscarPedidoPorOrg(UUID id, UUID organizationId) {
        return orderRepository
            .findByIdAndOrganizationIdAndDeletedAtIsNull(id, organizationId)
            .orElseThrow(() -> new ResourceNotFoundException("Pedido", id));
    }

    private Customer buscarClientePorOrg(UUID id, UUID organizationId) {
        return customerRepository
            .findByIdAndOrganizationId(id, organizationId)
            .orElseThrow(() -> new ResourceNotFoundException("Cliente", id));
    }

    private User buscarUsuarioPorOrg(UUID id, UUID organizationId) {
        return userRepository
            .findByIdAndOrganizationId(id, organizationId)
            .orElseThrow(() -> new ResourceNotFoundException("Usuário", id));
    }

    private Company buscarEmpresaPorOrg(UUID id, UUID organizationId) {
        return companyRepository
            .findByIdAndOrganizationId(id, organizationId)
            .orElseThrow(() -> new ResourceNotFoundException("Empresa", id));
    }

    private Organization buscarOrganizacao(UUID id) {
        return organizationRepository
            .findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Organização", id));
    }
}
