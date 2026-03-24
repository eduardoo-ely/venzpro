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
import java.util.stream.Collectors;

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

    private static final Map<OrderStatus, Set<OrderStatus>> TRANSICOES_VALIDAS = Map.of(
            OrderStatus.ORCAMENTO, EnumSet.of(OrderStatus.ENVIADO,   OrderStatus.CANCELADO),
            OrderStatus.ENVIADO,   EnumSet.of(OrderStatus.APROVADO,  OrderStatus.REJEITADO, OrderStatus.CANCELADO),
            OrderStatus.APROVADO,  EnumSet.of(OrderStatus.CONCLUIDO, OrderStatus.CANCELADO),
            OrderStatus.REJEITADO, EnumSet.noneOf(OrderStatus.class),
            OrderStatus.CONCLUIDO, EnumSet.noneOf(OrderStatus.class),
            OrderStatus.CANCELADO, EnumSet.noneOf(OrderStatus.class)
    );

    // ─────────────────────────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public OrderResponse create(OrderRequest req, UUID userId, UUID organizationId) {

        validarRequest(req);

        var customer = buscarClientePorOrg(req.customerId(), organizationId);
        var user     = buscarUsuarioPorOrg(userId, organizationId);
        var company  = buscarEmpresaPorOrg(req.companyId(), organizationId);

        validarCriacaoPedido(customer, user, req.companyId(), organizationId);

        var order = Order.builder()
                .customer(customer)
                .company(company)
                .user(user)
                .descricao(req.descricao())
                .status(OrderStatus.ORCAMENTO)
                .build();

        order.setOrganizationId(organizationId);

        var itens = criarItens(order, req.items(), organizationId);
        order.setItens(itens);

        order.recalcularTotal();

        var saved = orderRepository.save(order);

        registrarHistoricoStatus(saved, null, OrderStatus.ORCAMENTO, userId, "Criação inicial do pedido");

        auditService.log(
                organizationId,
                userId,
                AuditService.CREATE_ORDER,
                "Pedido",
                saved.getId(),
                "Cliente: " + customer.getNome() + " | Total: " + saved.getValorTotal()
        );

        return OrderResponse.from(saved);
    }

    // ─────────────────────────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public OrderResponse update(UUID id, OrderRequest req, UUID userId,
                                UUID organizationId, UserRole role) {

        validarRequest(req);

        var order = buscarPedidoPorOrg(id, organizationId);

        validarOwnerPedido(order, userId, role);
        validarPedidoEditavel(order, id, userId, organizationId);

        var customer = buscarClientePorOrg(req.customerId(), organizationId);
        var user     = buscarUsuarioPorOrg(userId, organizationId);
        var company  = buscarEmpresaPorOrg(req.companyId(), organizationId);

        validarCriacaoPedido(customer, user, req.companyId(), organizationId);

        order.setCustomer(customer);
        order.setCompany(company);
        order.setDescricao(req.descricao());

        aplicarItens(order, req.items(), organizationId);

        auditService.log(
                organizationId,
                userId,
                AuditService.UPDATE_ORDER,
                "Pedido",
                id,
                "Cliente: " + customer.getNome()
        );

        return OrderResponse.from(orderRepository.save(order));
    }

    // ─────────────────────────────────────────────────────────────
    // STATUS
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public OrderResponse updateStatus(UUID id, UUID userId, UUID organizationId,
                                      UserRole role, OrderStatusRequest req) {

        if (req == null || req.status() == null) {
            throw new BusinessException("Status é obrigatório.");
        }

        var order = buscarPedidoPorOrg(id, organizationId);
        validarOwnerPedido(order, userId, role);

        var statusAtual = order.getStatus();
        var novoStatus  = req.status();

        validarTransicaoStatus(statusAtual, novoStatus, req.motivo());

        var changedBy = buscarUsuarioPorOrg(userId, organizationId);

        if (novoStatus == OrderStatus.CANCELADO) {
            order.registrarCancelamento(changedBy, req.motivo());
        } else {
            order.setStatus(novoStatus);
        }

        var saved = orderRepository.save(order);

        registrarHistoricoStatus(saved, statusAtual, novoStatus, userId, req.motivo());

        auditService.log(organizationId, userId,
            AuditService.UPDATE_STATUS, "Pedido", id,
            statusAtual + " → " + novoStatus +
            (req.motivo() != null ? " | Motivo: " + req.motivo() : ""));

        return OrderResponse.from(saved);
    }

    // ─────────────────────────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public void delete(UUID id, UUID organizationId, UUID userId, UserRole role) {
        var order = buscarPedidoPorOrg(id, organizationId);
        validarOwnerPedido(order, userId, role);

        order.softDelete();
        orderRepository.save(order);
    }

    // ─────────────────────────────────────────────────────────────
    // VALIDAÇÕES
    // ─────────────────────────────────────────────────────────────

    private void validarRequest(OrderRequest req) {
        if (req == null) {
            throw new BusinessException("Requisição inválida.");
        }

        if (req.customerId() == null) {
            throw new BusinessException("Cliente é obrigatório.");
        }

        if (req.items() == null || req.items().isEmpty()) {
            throw new BusinessException("O pedido deve conter ao menos um item.");
        }
    }

    private void validarCriacaoPedido(Customer customer, User user, UUID companyId, UUID organizationId) {

        if (customer.getStatus() != CustomerStatus.APROVADO) {
            throw new BusinessException("Cliente não está aprovado.");
        }

        validarClienteParaPedido(customer, user);
        validarAcordoEmpresa(companyId, organizationId);
    }

    private void validarPedidoEditavel(Order order, UUID id, UUID userId, UUID organizationId) {

        if (order.getStatus() != OrderStatus.ORCAMENTO) {

            auditService.logError(
                    organizationId,
                    userId,
                    AuditService.UPDATE_ORDER,
                    "Edição negada — pedido " + id + " em status " + order.getStatus()
            );

            throw new BusinessException(
                    "Somente pedidos em ORÇAMENTO podem ser editados. " +
                            "Status atual: " + order.getStatus() + "."
            );
        }
    }

    private void validarTransicaoStatus(OrderStatus atual, OrderStatus novo, String motivo) {

        if (atual == OrderStatus.CONCLUIDO) {
            throw new BusinessException(
                    "Pedidos CONCLUÍDOS não podem ser alterados. " +
                            "Este é um status terminal — o pedido foi finalizado com sucesso."
            );
        }

        if (atual == OrderStatus.CANCELADO) {
            throw new BusinessException(
                    "Pedidos CANCELADOS não podem ser alterados. " +
                            "Este é um status terminal."
            );
        }

        if (atual == OrderStatus.REJEITADO) {
            throw new BusinessException(
                    "Pedidos REJEITADOS não podem ser alterados. " +
                            "Este é um status terminal."
            );
        }

        var permitidos = TRANSICOES_VALIDAS.get(atual);

        if (permitidos == null || !permitidos.contains(novo)) {
            throw new BusinessException(
                    "Transição inválida: " + atual + " → " + novo + ". " +
                            "Transições permitidas a partir de " + atual + ": " +
                            (permitidos == null || permitidos.isEmpty() ? "nenhuma" : permitidos)
            );
        }

        if (novo == OrderStatus.CANCELADO && atual == OrderStatus.APROVADO) {
            if (motivo == null || motivo.isBlank()) {
                throw new BusinessException(
                        "O motivo é obrigatório ao cancelar um pedido já APROVADO."
                );
            }
        }
    }

    private void validarOwnerPedido(Order order, UUID userId, UserRole role) {
        if (role == UserRole.VENDEDOR &&
                !order.getUser().getId().equals(userId)) {
            throw new TenantViolationException("Sem permissão.");
        }
    }

    private void validarClienteParaPedido(Customer customer, User user) {

        if (customer.getStatus() != CustomerStatus.APROVADO) {
            throw new BusinessException(
                    "Cliente precisa estar APROVADO para gerar pedido. " +
                            "Status atual: " + customer.getStatus() + ". " +
                            "Solicite a aprovação ao gerente ou administrador."
            );
        }

        if (customer.getOwner() == null) {
            throw new BusinessException(
                    "O cliente \"" + customer.getNome() + "\" não possui responsável atribuído. " +
                            "Atribua um responsável antes de criar o pedido."
            );
        }

        if (user.getRole() == UserRole.VENDEDOR &&
                !customer.getOwner().getId().equals(user.getId())) {

            throw new TenantViolationException(
                    "Você não pode criar pedidos para clientes de outro vendedor."
            );
        }
    }

    private void validarAcordoEmpresa(UUID companyId, UUID organizationId) {

        if (companyId != null &&
                !agreementService.hasActiveAgreement(organizationId, companyId)) {

            throw new BusinessException(
                    "Sua organização não possui um acordo ativo para vender " +
                            "produtos desta empresa."
            );
        }
    }

    // ─────────────────────────────────────────────────────────────
    // ITENS
    // ─────────────────────────────────────────────────────────────

    private List<OrderItem> criarItens(Order order, List<OrderItemRequest> items, UUID organizationId) {

        return items.stream().map(itemReq -> {

            var product = productRepository
                    .findByIdAndOrganizationId(itemReq.productId(), organizationId)
                    .orElseThrow(() -> new ResourceNotFoundException("Produto", itemReq.productId()));

            if (product.getPrecoBase() == null) {
                throw new BusinessException("Produto sem preço.");
            }

            return OrderItem.builder()
                    .order(order)
                    .product(product)
                    .quantidade(itemReq.quantidade())
                    .precoUnitario(product.getPrecoBase())
                    .build();

        }).toList();
    }

    private void aplicarItens(Order order, List<OrderItemRequest> items, UUID organizationId) {

        if (items == null || items.isEmpty()) {
            throw new BusinessException("O pedido deve conter ao menos um item.");
        }

        order.clearItens();

        for (OrderItemRequest req : items) {

            var product = productRepository
                    .findByIdAndOrganizationId(req.productId(), organizationId)
                    .orElseThrow(() -> new ResourceNotFoundException("Produto", req.productId()));

            if (product.getPrecoBase() == null) {
                throw new BusinessException(
                        "Produto '" + product.getNome() + "' não possui preço definido."
                );
            }

            order.addItem(
                    OrderItem.builder()
                            .product(product)
                            .quantidade(req.quantidade())
                            .precoUnitario(product.getPrecoBase())
                            .build()
            );
        }

        order.recalcularTotal();
    }

    // ─────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────

    private void registrarHistoricoStatus(Order order, OrderStatus de, OrderStatus para, UUID userId, String motivo) {
        var user = buscarUsuarioPorOrg(userId, order.getOrganizationId());

        statusHistoryRepository.save(
                OrderStatusHistory.builder()
                        .order(order)
                        .oldStatus(de)
                        .newStatus(para)
                        .changedBy(user)
                        .motivo(motivo)
                        .build()
        );
    }

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
}