package com.venzpro.application.service;

import com.venzpro.application.dto.request.OrderItemRequest;
import com.venzpro.application.dto.request.OrderRequest;
import com.venzpro.application.dto.response.OrderResponse;
import com.venzpro.domain.entity.Order;
import com.venzpro.domain.entity.OrderItem;
import com.venzpro.domain.entity.Customer;
import com.venzpro.domain.entity.Product;
import com.venzpro.domain.entity.User;
import com.venzpro.domain.enums.CustomerStatus;
import com.venzpro.domain.enums.OrderStatus;
import com.venzpro.domain.enums.UserRole;
import com.venzpro.domain.repository.CompanyRepository;
import com.venzpro.domain.repository.CustomerRepository;
import com.venzpro.domain.repository.OrderRepository;
import com.venzpro.domain.repository.OrganizationRepository;
import com.venzpro.domain.repository.ProductRepository;
import com.venzpro.domain.repository.UserRepository;
import com.venzpro.infrastructure.exception.BusinessException;
import com.venzpro.infrastructure.exception.ResourceNotFoundException;
import com.venzpro.infrastructure.exception.TenantViolationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final ProductRepository productRepository;
    private final AuditService auditService;

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

        var savedOrder = orderRepository.save(order);
        auditService.log(organizationId, userId, AuditService.CREATE_ORDER,
                "Pedido", savedOrder.getId(), "Cliente: " + customer.getNome());
        return OrderResponse.from(savedOrder);
    }

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

    @Transactional
    public OrderResponse updateStatus(UUID id, OrderStatus status, UUID organizationId) {
        var order = orderRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Pedido", id));
        order.setStatus(status);
        return OrderResponse.from(orderRepository.save(order));
    }

    @Transactional
    public OrderResponse update(UUID id, OrderRequest req, UUID userId, UUID organizationId) {
        var order = orderRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Pedido", id));
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

        applyItems(order, req.items(), organizationId);
        return OrderResponse.from(orderRepository.save(order));
    }

    @Transactional
    public void delete(UUID id, UUID organizationId) {
        var order = orderRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Pedido", id));
        orderRepository.delete(order);
    }

    private void validateCustomerForOrder(Customer customer, User user) {
        if (customer.getStatus() != CustomerStatus.APROVADO) {
            throw new BusinessException("Cliente precisa estar APROVADO para gerar pedido");
        }
        if (user.getRole() == UserRole.VENDEDOR) {
            if (customer.getOwner() == null || !customer.getOwner().getId().equals(user.getId())) {
                throw new TenantViolationException("Este cliente não pertence à sua carteira");
            }
        }
    }

    private void applyItems(Order order, List<OrderItemRequest> items, UUID organizationId) {
        if (items == null || items.isEmpty()) {
            throw new BusinessException("Pedido deve conter ao menos um item");
        }

        order.clearItens();

        for (OrderItemRequest itemRequest : items) {
            Product product = productRepository.findByIdAndOrganizationId(itemRequest.productId(), organizationId)
                    .orElseThrow(() -> new ResourceNotFoundException("Produto", itemRequest.productId()));

            if (product.getPrecoBase() == null) {
                throw new BusinessException("Produto " + product.getId() + " não possui preço definido");
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
}
