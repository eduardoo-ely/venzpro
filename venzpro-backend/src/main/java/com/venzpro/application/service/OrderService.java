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
    private final AgreementService             agreementService;

    private static final java.util.Map<OrderStatus, Set<OrderStatus>> TRANSICOES_VALIDAS =
            java.util.Map.of(
                    OrderStatus.ORCAMENTO,  EnumSet.of(OrderStatus.ENVIADO,   OrderStatus.CANCELADO),
                    OrderStatus.ENVIADO,    EnumSet.of(OrderStatus.APROVADO,   OrderStatus.REJEITADO, OrderStatus.CANCELADO),
                    OrderStatus.APROVADO,   EnumSet.of(OrderStatus.CONCLUIDO,  OrderStatus.CANCELADO),
                    OrderStatus.REJEITADO,  EnumSet.noneOf(OrderStatus.class),
                    OrderStatus.CONCLUIDO,  EnumSet.noneOf(OrderStatus.class),
                    OrderStatus.CANCELADO,  EnumSet.noneOf(OrderStatus.class)
            );

    @Transactional
    public OrderResponse create(OrderRequest req, UUID userId, UUID organizationId) {
        var customer = customerRepository.findByIdAndOrganizationId(req.customerId(), organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", req.customerId()));
        var user = userRepository.findByIdAndOrganizationId(userId, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", userId));
        validateCustomerForOrder(customer, user);
        validateCompanyAgreement(req.companyId(), organizationId);
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

    @Transactional(readOnly = true)
    public List<OrderResponse> findAll(UUID organizationId, UUID userId, UserRole role, OrderStatus status) {
        List<Order> list;
        if (role == UserRole.VENDEDOR) {
            list = status != null
                    ? orderRepository.findAllByOrganizationIdAndStatusAndUserId(organizationId, status, userId)
                    : orderRepository.findAllByOrganizationIdAndUserId(organizationId, userId);
        } else {
            list = status != null
                    ? orderRepository.findAllByOrganizationIdAndStatus(organizationId, status)
                    : orderRepository.findAllByOrganizationId(organizationId);
        }
        return list.stream().map(OrderResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public OrderResponse findById(UUID id, UUID organizationId, UUID userId, UserRole role) {
        var order = orderRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Pedido", id));
        validateOrderOwnership(order, userId, role);
        return OrderResponse.from(order);
    }

    @Transactional
    public OrderResponse update(UUID id, OrderRequest req, UUID userId, UUID organizationId, UserRole role) {
        var order = orderRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Pedido", id));

        validateOrderOwnership(order, userId, role);

        if (order.getStatus() != OrderStatus.ORCAMENTO) {
            auditService.logError(organizationId, userId, AuditService.UPDATE_ORDER,
                    "Tentativa de edição negada — pedido " + id + " está em status " + order.getStatus() + ". Apenas ORCAMENTO pode ser editado.");
            throw new BusinessException("Apenas pedidos em ORÇAMENTO podem ser editados. Status atual: " + order.getStatus() + ". Para alterar o pedido, entre em contato com o responsável.");
        }

        var customer = customerRepository.findByIdAndOrganizationId(req.customerId(), organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", req.customerId()));
        var user = userRepository.findByIdAndOrganizationId(userId, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", userId));
        validateCustomerForOrder(customer, user);
        validateCompanyAgreement(req.companyId(), organizationId);
        var company = companyRepository.findByIdAndOrganizationId(req.companyId(), organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa", req.companyId()));

        order.setCustomer(customer);
        order.setCompany(company);
        order.setDescricao(req.descricao());

        applyItems(order, req.items(), organizationId);

        auditService.log(organizationId, userId, AuditService.UPDATE_ORDER,
                "Pedido", id, "Cliente: " + customer.getNome());

        return OrderResponse.from(orderRepository.save(order));
    }

    @Transactional
    public OrderResponse updateStatus(UUID id, UUID userId, UUID organizationId, UserRole role, OrderStatusRequest req) {
        var order = orderRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Pedido", id));

        validateOrderOwnership(order, userId, role);

        OrderStatus statusAtual = order.getStatus();
        OrderStatus novoStatus  = req.status();

        Set<OrderStatus> permitidos = TRANSICOES_VALIDAS.get(statusAtual);
        if (!permitidos.contains(novoStatus)) {
            throw new BusinessException("Transição inválida: " + statusAtual + " → " + novoStatus + ". Transições permitidas a partir de " + statusAtual + ": " + (permitidos.isEmpty() ? "nenhuma (status terminal)" : permitidos));
        }

        if (novoStatus == OrderStatus.CANCELADO && statusAtual == OrderStatus.APROVADO && (req.motivo() == null || req.motivo().isBlank())) {
            throw new BusinessException("O motivo é obrigatório ao cancelar um pedido já APROVADO.");
        }

        var changedBy = userRepository.findByIdAndOrganizationId(userId, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", userId));

        order.setStatus(novoStatus);

        if (novoStatus == OrderStatus.CANCELADO) {
            order.setCanceladoPor(changedBy);
            order.setCanceladoEm(java.time.OffsetDateTime.now());
            order.setMotivoCancelamento(req.motivo());
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

        auditService.log(organizationId, userId, AuditService.UPDATE_STATUS,
                "Pedido", id, statusAtual + " → " + novoStatus + (req.motivo() != null ? " | Motivo: " + req.motivo() : ""));

        return OrderResponse.from(saved);
    }

    @Transactional
    public void delete(UUID id, UUID organizationId, UUID userId, UserRole role) {
        var order = orderRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Pedido", id));
        validateOrderOwnership(order, userId, role);
        orderRepository.delete(order);
    }

    private void validateOrderOwnership(Order order, UUID userId, UserRole role) {
        if (role == UserRole.VENDEDOR && !order.getUser().getId().equals(userId)) {
            throw new TenantViolationException("Você não tem permissão para acessar um pedido de outro vendedor.");
        }
    }

    private void validateCustomerForOrder(Customer customer, User user) {
        if (customer.getStatus() != CustomerStatus.APROVADO) {
            throw new BusinessException("Cliente precisa estar APROVADO para gerar pedido. Status atual: " + customer.getStatus() + ". Solicite a aprovação ao gerente ou administrador.");
        }
        if (customer.getOwner() == null) {
            throw new BusinessException("O cliente \"" + customer.getNome() + "\" não possui responsável atribuído. Atribua um responsável antes de criar o pedido.");
        }
        if (user.getRole() == UserRole.VENDEDOR) {
            if (!customer.getOwner().getId().equals(user.getId())) {
                throw new TenantViolationException("Você não pode criar pedidos para clientes de outro vendedor.");
            }
        }
    }

    private void applyItems(Order order, List<OrderItemRequest> items, UUID organizationId) {
        if (items == null || items.isEmpty()) {
            throw new BusinessException("Pedido deve conter ao menos um item.");
        }
        order.clearItens();
        for (OrderItemRequest itemRequest : items) {
            Product product = productRepository.findByIdAndOrganizationId(itemRequest.productId(), organizationId)
                    .orElseThrow(() -> new ResourceNotFoundException("Produto", itemRequest.productId()));

            if (product.getPrecoBase() == null) {
                throw new BusinessException("Produto '" + product.getNome() + "' não possui preço definido.");
            }
            OrderItem item = OrderItem.builder()
                    .product(product)
                    .quantidade(itemRequest.quantidade())
                    .precoUnitario(product.getPrecoBase())
                    .build();
            order.addItem(item);
        }
        order.recalcularTotal();
    }

    private void validateCompanyAgreement(UUID companyId, UUID organizationId) {
        if (companyId != null) {
            boolean hasAgreement = agreementService.hasActiveAgreement(organizationId, companyId);
            if (!hasAgreement) {
                throw new BusinessException("Sua organização não possui um acordo ativo para vender produtos desta empresa.");
            }
        }
    }
}