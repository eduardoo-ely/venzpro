package com.venzpro.application.service;

import com.venzpro.application.dto.request.OrderItemRequest;
import com.venzpro.application.dto.request.OrderRequest;
import com.venzpro.application.dto.request.OrderStatusRequest;
import com.venzpro.application.dto.response.OrderResponse;
import com.venzpro.domain.entity.Order;
import com.venzpro.domain.entity.OrderItem;
import com.venzpro.domain.entity.OrderStatusHistory;
import com.venzpro.domain.entity.Customer;
import com.venzpro.domain.entity.Product;
import com.venzpro.domain.entity.User;
import com.venzpro.domain.enums.CustomerStatus;
import com.venzpro.domain.enums.OrderStatus;
import com.venzpro.domain.enums.UserRole;
import com.venzpro.domain.repository.CompanyRepository;
import com.venzpro.domain.repository.CustomerRepository;
import com.venzpro.domain.repository.OrderRepository;
import com.venzpro.domain.repository.OrderStatusHistoryRepository;
import com.venzpro.domain.repository.OrganizationRepository;
import com.venzpro.domain.repository.ProductRepository;
import com.venzpro.domain.repository.UserRepository;
import com.venzpro.infrastructure.exception.BusinessException;
import com.venzpro.infrastructure.exception.ResourceNotFoundException;
import com.venzpro.infrastructure.exception.TenantViolationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;
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

    // ── Mapa de transições válidas ────────────────────────────────────────────
    //
    // Regra 9.4-9.5:
    //   ORCAMENTO  → ENVIADO, CANCELADO
    //   ENVIADO    → APROVADO, REJEITADO, CANCELADO
    //   APROVADO   → CONCLUIDO, CANCELADO (exige motivo)
    //   REJEITADO  → terminal (nenhuma transição)
    //   CONCLUIDO  → terminal (nenhuma transição)
    //   CANCELADO  → terminal (nenhuma transição)
    //
    // Implementado como método estático para ser consultável sem instância,
    // facilitando testes unitários futuros.

    private static final java.util.Map<OrderStatus, Set<OrderStatus>> TRANSICOES_VALIDAS =
            java.util.Map.of(
                    OrderStatus.ORCAMENTO,  EnumSet.of(OrderStatus.ENVIADO,   OrderStatus.CANCELADO),
                    OrderStatus.ENVIADO,    EnumSet.of(OrderStatus.APROVADO,   OrderStatus.REJEITADO, OrderStatus.CANCELADO),
                    OrderStatus.APROVADO,   EnumSet.of(OrderStatus.CONCLUIDO,  OrderStatus.CANCELADO),
                    OrderStatus.REJEITADO,  EnumSet.noneOf(OrderStatus.class),
                    OrderStatus.CONCLUIDO,  EnumSet.noneOf(OrderStatus.class),
                    OrderStatus.CANCELADO,  EnumSet.noneOf(OrderStatus.class)
            );

    // ── CREATE ────────────────────────────────────────────────────────────────

    @Transactional
    public OrderResponse create(OrderRequest req, UUID userId, UUID organizationId) {
        var customer = customerRepository.findByIdAndOrganizationId(req.customerId(), organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", req.customerId()));
        var user = userRepository.findByIdAndOrganizationId(userId, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", userId));
        validateCustomerForOrder(customer, user);

        var company = companyRepository.findByIdAndOrganizationId(req.companyId(), organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa", req.companyId()));
        var org = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organização", organizationId));

        var order = Order.builder()
                .customer(customer)
                .company(company)
                .user(user)
                .organization(org)
                .descricao(req.descricao())
                .build();
        order.setStatus(OrderStatus.ORCAMENTO);

        applyItems(order, req.items(), organizationId);

        var saved = orderRepository.save(order);
        auditService.log(organizationId, userId, AuditService.CREATE_ORDER,
                "Pedido", saved.getId(), "Cliente: " + customer.getNome());
        return OrderResponse.from(saved);
    }

    // ── READ ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OrderResponse> findAll(UUID organizationId, OrderStatus status) {
        var list = status != null
                ? orderRepository.findAllByOrganizationIdAndStatus(organizationId, status)
                : orderRepository.findAllByOrganizationId(organizationId);
        return list.stream().map(OrderResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public OrderResponse findById(UUID id, UUID organizationId) {
        return orderRepository.findByIdAndOrganizationId(id, organizationId)
                .map(OrderResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Pedido", id));
    }

    // ── UPDATE DADOS ──────────────────────────────────────────────────────────

    /**
     * Edita os dados de um pedido.
     *
     * VALIDAÇÃO DE STATUS — acontece logo no início, antes de qualquer
     * outro processamento (conforme solicitado):
     *   Apenas pedidos em ORCAMENTO podem ser editados.
     *   Qualquer outro status é imutável — os valores foram congelados
     *   no momento da transição e não devem ser alterados externamente.
     *
     * CONGELAMENTO DE PREÇO:
     *   Quando o pedido ainda está em ORCAMENTO, applyItems() recaptura
     *   o precoBase atual de cada produto e recalcula o total.
     *   Uma vez que o pedido sai de ORCAMENTO (via updateStatus), os itens
     *   e preços gravados em order_items nunca mais são tocados por este método.
     *
     * AUDITORIA DE TENTATIVA NEGADA:
     *   Se o status não for ORCAMENTO, a tentativa de edição é registrada
     *   em nível WARN antes de lançar a exceção.
     */
    @Transactional
    public OrderResponse update(UUID id, OrderRequest req, UUID userId, UUID organizationId) {

        var order = orderRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Pedido", id));

        // ── VALIDAÇÃO DE STATUS — primeiro bloco, sem exceção ─────────────────
        if (order.getStatus() != OrderStatus.ORCAMENTO) {
            // Auditoria da tentativa negada (segurança e rastreabilidade)
            auditService.logError(
                    organizationId,
                    userId,
                    AuditService.UPDATE_ORDER,
                    "Tentativa de edição negada — pedido " + id +
                            " está em status " + order.getStatus() +
                            ". Apenas ORCAMENTO pode ser editado."
            );
            throw new BusinessException(
                    "Apenas pedidos em ORÇAMENTO podem ser editados. " +
                            "Status atual: " + order.getStatus() + ". " +
                            "Para alterar o pedido, entre em contato com o responsável."
            );
        }
        // ── A partir daqui o pedido está em ORCAMENTO — edição permitida ──────

        var customer = customerRepository.findByIdAndOrganizationId(req.customerId(), organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", req.customerId()));
        var user = userRepository.findByIdAndOrganizationId(userId, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", userId));
        validateCustomerForOrder(customer, user);

        var company = companyRepository.findByIdAndOrganizationId(req.companyId(), organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa", req.companyId()));

        order.setCustomer(customer);
        order.setCompany(company);
        order.setDescricao(req.descricao());

        // applyItems() recaptura precoBase atual e recalcula o total.
        // Isso é correto porque o pedido ainda está em ORCAMENTO:
        // o preço só é congelado definitivamente quando sai deste status.
        applyItems(order, req.items(), organizationId);

        auditService.log(organizationId, userId, AuditService.UPDATE_ORDER,
                "Pedido", id, "Cliente: " + customer.getNome());

        return OrderResponse.from(orderRepository.save(order));
    }

    // ── UPDATE STATUS ─────────────────────────────────────────────────────────

    @Transactional
    public OrderResponse updateStatus(UUID id,
                                      UUID userId,
                                      UUID organizationId,
                                      OrderStatusRequest req) {

        var order = orderRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Pedido", id));

        OrderStatus statusAtual = order.getStatus();
        OrderStatus novoStatus  = req.status();

        // ── Valida transição ──────────────────────────────────────────────────
        Set<OrderStatus> permitidos = TRANSICOES_VALIDAS.get(statusAtual);
        if (!permitidos.contains(novoStatus)) {
            throw new BusinessException(
                    "Transição inválida: " + statusAtual + " → " + novoStatus + ". " +
                            "Transições permitidas a partir de " + statusAtual + ": " +
                            (permitidos.isEmpty() ? "nenhuma (status terminal)" : permitidos)
            );
        }

        // ── Motivo obrigatório ao cancelar pedido APROVADO ────────────────────
        if (novoStatus == OrderStatus.CANCELADO
                && statusAtual == OrderStatus.APROVADO
                && (req.motivo() == null || req.motivo().isBlank())) {
            throw new BusinessException(
                    "O motivo é obrigatório ao cancelar um pedido já APROVADO."
            );
        }

        // ── Busca o usuário que executa (para histórico e cancelamento) ───────
        var changedBy = userRepository.findByIdAndOrganizationId(userId, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", userId));

        // ── Operação 1: atualiza o pedido ─────────────────────────────────────
        order.setStatus(novoStatus);

        if (novoStatus == OrderStatus.CANCELADO) {
            order.setCanceladoPor(changedBy);
            order.setCanceladoEm(java.time.OffsetDateTime.now());
            order.setMotivoCancelamento(req.motivo());
        }

        var saved = orderRepository.save(order);

        // ── Operação 2: grava o histórico ─────────────────────────────────────
        // Ambas na mesma @Transactional — se o histórico falhar,
        // o update do pedido é revertido automaticamente.
        statusHistoryRepository.save(
                OrderStatusHistory.builder()
                        .order(saved)
                        .oldStatus(statusAtual)
                        .newStatus(novoStatus)
                        .changedBy(changedBy)
                        .motivo(req.motivo())
                        .build()
        );

        // ── Auditoria assíncrona ──────────────────────────────────────────────
        auditService.log(
                organizationId, userId, AuditService.UPDATE_STATUS,
                "Pedido", id,
                statusAtual + " → " + novoStatus +
                        (req.motivo() != null ? " | Motivo: " + req.motivo() : "")
        );

        return OrderResponse.from(saved);
    }

    // ── DELETE ────────────────────────────────────────────────────────────────

    @Transactional
    public void delete(UUID id, UUID organizationId) {
        var order = orderRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Pedido", id));
        orderRepository.delete(order);
    }

    // ── HELPERS PRIVADOS ──────────────────────────────────────────────────────

    private void validateCustomerForOrder(Customer customer, User user) {
        if (customer.getStatus() != CustomerStatus.APROVADO) {
            throw new BusinessException(
                    "Cliente precisa estar APROVADO para gerar pedido. " +
                            "Status atual: " + customer.getStatus()
            );
        }
        if (user.getRole() == UserRole.VENDEDOR) {
            if (customer.getOwner() == null || !customer.getOwner().getId().equals(user.getId())) {
                throw new TenantViolationException("Este cliente não pertence à sua carteira.");
            }
        }
    }

    private void applyItems(Order order, List<OrderItemRequest> items, UUID organizationId) {
        if (items == null || items.isEmpty()) {
            throw new BusinessException("Pedido deve conter ao menos um item.");
        }

        order.clearItens();

        for (OrderItemRequest itemRequest : items) {
            Product product = productRepository.findByIdAndOrganizationId(
                            itemRequest.productId(), organizationId)
                    .orElseThrow(() -> new ResourceNotFoundException("Produto", itemRequest.productId()));

            if (product.getPrecoBase() == null) {
                throw new BusinessException(
                        "Produto '" + product.getNome() + "' não possui preço definido."
                );
            }

            // precoUnitario = precoBase no momento da criação/edição do item.
            // Nunca será alterado por mudanças futuras no produto.
            OrderItem item = OrderItem.builder()
                    .product(product)
                    .quantidade(itemRequest.quantidade())
                    .precoUnitario(product.getPrecoBase())
                    .build();
            order.addItem(item);
        }

        order.recalcularTotal();
    }
}