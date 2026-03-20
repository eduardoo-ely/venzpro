package com.venzpro.application.service;

import com.venzpro.application.dto.request.OrderRequest;
import com.venzpro.application.dto.response.OrderResponse;
import com.venzpro.domain.entity.Order;
import com.venzpro.domain.enums.OrderStatus;
import com.venzpro.domain.repository.*;
import com.venzpro.application.service.AuditService;
import com.venzpro.exception.ResourceNotFoundException;
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
    private final AuditService auditService;

    @Transactional
    public OrderResponse create(OrderRequest req, UUID userId, UUID organizationId) {
        var customer = customerRepository.findByIdAndOrganizationId(req.customerId(), organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", req.customerId()));
        var company = companyRepository.findByIdAndOrganizationId(req.companyId(), organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa", req.companyId()));
        var user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", userId));
        var org = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organização", organizationId));

        var order = Order.builder()
                .customer(customer).company(company).user(user).organization(org)
                .valorTotal(req.valorTotal()).status(req.status()).descricao(req.descricao())
                .build();
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
        var company = companyRepository.findByIdAndOrganizationId(req.companyId(), organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa", req.companyId()));

        order.setCustomer(customer);
        order.setCompany(company);
        order.setValorTotal(req.valorTotal());
        order.setStatus(req.status());
        order.setDescricao(req.descricao());
        return OrderResponse.from(orderRepository.save(order));
    }

    @Transactional
    public void delete(UUID id, UUID organizationId) {
        var order = orderRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Pedido", id));
        orderRepository.delete(order);
    }
}
