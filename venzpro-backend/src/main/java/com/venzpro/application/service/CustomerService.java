package com.venzpro.application.service;

import com.venzpro.application.dto.request.CustomerOwnerRequest;
import com.venzpro.application.dto.request.CustomerRequest;
import com.venzpro.application.dto.request.CustomerStatusRequest;
import com.venzpro.application.dto.response.CustomerResponse;
import com.venzpro.domain.entity.Customer;
import com.venzpro.domain.entity.CustomerOwnerHistory;
import com.venzpro.domain.entity.User;
import com.venzpro.domain.enums.CustomerStatus;
import com.venzpro.domain.enums.UserRole;
import com.venzpro.domain.enums.OrderStatus;
import com.venzpro.domain.repository.OrderRepository;
import com.venzpro.domain.repository.CustomerOwnerHistoryRepository;
import com.venzpro.domain.repository.CustomerRepository;
import com.venzpro.domain.repository.OrganizationRepository;
import com.venzpro.domain.repository.UserRepository;
import com.venzpro.infrastructure.exception.BusinessException;
import com.venzpro.infrastructure.exception.ResourceNotFoundException;
import com.venzpro.infrastructure.exception.TenantViolationException;
import com.venzpro.infrastructure.security.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final OrderRepository                   orderRepository;
    private final CustomerRepository                customerRepository;
    private final UserRepository                    userRepository;
    private final OrganizationRepository            organizationRepository;
    private final CustomerOwnerHistoryRepository    ownerHistoryRepository;
    private final AuditService                      auditService;
    private final NotificationService               notificationService;

    private static final String CREATE_CUSTOMER   = "CREATE_CUSTOMER";
    private static final String APPROVE_CUSTOMER  = "APPROVE_CUSTOMER";
    private static final String REJECT_CUSTOMER   = "REJECT_CUSTOMER";
    private static final String ASSIGN_OWNER      = "ASSIGN_OWNER";
    private static final String UNASSIGN_OWNER    = "UNASSIGN_OWNER";

    @Transactional
    public CustomerResponse create(CustomerRequest req, UUID userId) {
        UUID orgId = TenantContext.get();

        var user = userRepository.findByIdAndOrganizationId(userId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", userId));
        var org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organização", orgId));

        String docNormalizado = normalizarDocumento(req.cpfCnpj());
        if (docNormalizado != null && !docNormalizado.isBlank()) {
            if (customerRepository.existsByCpfCnpjAndOrganizationId(docNormalizado, orgId)) {
                throw new BusinessException("Já existe um cliente cadastrado com este CPF/CNPJ nesta organização.");
            }
        }

        var customer = Customer.builder()
                .nome(req.nome())
                .telefone(req.telefone())
                .email(req.email())
                .cidade(req.cidade())
                .cpfCnpj(docNormalizado)
                .owner(null)
                .createdBy(user)
                .organization(org)
                .build();

        Customer saved = customerRepository.save(customer);
        auditService.log(orgId, userId, CREATE_CUSTOMER, "Customer", saved.getId(), "Cliente: " + saved.getNome());
        return CustomerResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<CustomerResponse> findAll(UUID organizationId, UUID userId, UserRole role) {
        List<Customer> customers;
        if (role == UserRole.VENDEDOR) {
            customers = customerRepository.findAllByOrganizationIdAndOwnerId(organizationId, userId);
        } else {
            customers = customerRepository.findAllByOrganizationId(organizationId);
        }
        return customers.stream().map(CustomerResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public CustomerResponse findById(UUID id, UUID organizationId, UUID userId, UserRole role) {
        var customer = customerRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", id));
        validateCustomerOwnership(customer, userId, role);
        return CustomerResponse.from(customer);
    }

    @Transactional(readOnly = true)
    public List<CustomerResponse> findGeladeira(UUID organizationId) {
        return customerRepository.findAllByOrganizationIdAndOwnerIsNull(organizationId)
                .stream().map(CustomerResponse::from).toList();
    }

    @Transactional
    public CustomerResponse update(UUID id, CustomerRequest req, UUID organizationId, UUID userId, UserRole role) {
        var customer = customerRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", id));

        validateCustomerOwnership(customer, userId, role);

        String docNormalizado = normalizarDocumento(req.cpfCnpj());
        if (docNormalizado != null && !docNormalizado.isBlank() && !docNormalizado.equals(customer.getCpfCnpj())) {
            if (customerRepository.existsByCpfCnpjAndOrganizationIdAndIdNot(docNormalizado, organizationId, id)) {
                throw new BusinessException("Já existe outro cliente com este CPF/CNPJ nesta organização.");
            }
        }
        customer.setNome(req.nome());
        customer.setTelefone(req.telefone());
        customer.setEmail(req.email());
        customer.setCidade(req.cidade());
        if (docNormalizado != null) customer.setCpfCnpj(docNormalizado);
        return CustomerResponse.from(customerRepository.save(customer));
    }

    @Transactional
    public CustomerResponse updateStatus(UUID id, UUID organizationId, UUID requesterId, UserRole requesterRole, CustomerStatusRequest req) {
        if (requesterRole != UserRole.ADMIN && requesterRole != UserRole.GERENTE) {
            throw new BusinessException("Apenas ADMIN ou GERENTE podem alterar o status de clientes.");
        }

        var customer = customerRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", id));

        if (customer.getStatus() != CustomerStatus.PENDENTE) {
            throw new BusinessException("Somente clientes com status PENDENTE podem ser aprovados ou rejeitados. Status atual: " + customer.getStatus());
        }

        if (req.status() == CustomerStatus.REJEITADO && (req.motivo() == null || req.motivo().isBlank())) {
            throw new BusinessException("O motivo é obrigatório ao rejeitar um cliente.");
        }

        customer.setStatus(req.status());
        var saved = customerRepository.save(customer);

        String acao = req.status() == CustomerStatus.APROVADO ? APPROVE_CUSTOMER : REJECT_CUSTOMER;
        String detalhes = "Cliente: " + customer.getNome() + (req.motivo() != null ? " | Motivo: " + req.motivo() : "");
        auditService.log(organizationId, requesterId, acao, "Customer", id, detalhes);

        if (req.status() == CustomerStatus.APROVADO && saved.getOwner() == null) {
            notificationService.notificarClienteAprovadoSemOwner(organizationId, customer.getNome());
        }

        return CustomerResponse.from(saved);
    }

    @Transactional
    public CustomerResponse updateOwner(UUID id, UUID organizationId, UUID requesterId, UserRole requesterRole, CustomerOwnerRequest req) {
        if (requesterRole != UserRole.ADMIN && requesterRole != UserRole.GERENTE) {
            throw new BusinessException("Apenas ADMIN ou GERENTE podem redistribuir a carteira de clientes.");
        }

        var customer = customerRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", id));

        var changedBy = userRepository.findByIdAndOrganizationId(requesterId, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", requesterId));

        User oldOwner = customer.getOwner();
        User newOwner = null;

        if (req.ownerId() != null) {
            newOwner = userRepository.findByIdAndOrganizationId(req.ownerId(), organizationId)
                    .orElseThrow(() -> new ResourceNotFoundException("Usuário", req.ownerId()));

            if (newOwner.getRole() == UserRole.ADMIN) {
                throw new BusinessException("Usuários com role ADMIN não podem ser responsáveis por clientes. Selecione um VENDEDOR ou GERENTE.");
            }
            if (oldOwner != null && oldOwner.getId().equals(newOwner.getId())) {
                throw new BusinessException("O cliente já está atribuído para este responsável.");
            }
        }

        customer.setOwner(newOwner);
        var saved = customerRepository.save(customer);

        ownerHistoryRepository.save(
                CustomerOwnerHistory.builder()
                        .customer(saved)
                        .oldOwner(oldOwner)
                        .newOwner(newOwner)
                        .changedBy(changedBy)
                        .build()
        );

        String acao = (newOwner != null) ? ASSIGN_OWNER : UNASSIGN_OWNER;
        String detalhes = "Cliente: " + customer.getNome()
                + " | Anterior: " + (oldOwner != null ? oldOwner.getNome() : "nenhum")
                + " | Novo: "     + (newOwner != null ? newOwner.getNome() : "nenhum");
        auditService.log(organizationId, requesterId, acao, "Customer", id, detalhes);

        if (newOwner == null && oldOwner != null) {
            notificationService.notificarClienteSemOwner(organizationId, customer.getNome());
        }

        return CustomerResponse.from(saved);
    }

    @Transactional
    public void delete(UUID id, UUID organizationId, UUID userId, UserRole role) {
        var customer = customerRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", id));

        validateCustomerOwnership(customer, userId, role);

        // Bloqueia delete de cliente com pedidos não-terminais
        long pedidosAtivos = orderRepository.countByCustomerIdAndStatusIn(
                id, List.of(OrderStatus.ORCAMENTO, OrderStatus.ENVIADO, OrderStatus.APROVADO)
        );
        if (pedidosAtivos > 0) {
            throw new BusinessException(
                    "Não é possível remover cliente com " + pedidosAtivos + " pedido(s) em andamento."
            );
        }

        customer.softDelete();
        customerRepository.save(customer);
        auditService.log(organizationId, userId, AuditService.DELETE_CUSTOMER,
                "Customer", id, "Cliente removido: " + customer.getNome());
    }

    private void validateCustomerOwnership(Customer customer, UUID userId, UserRole role) {
        if (role == UserRole.VENDEDOR) {
            if (customer.getOwner() == null || !customer.getOwner().getId().equals(userId)) {
                throw new TenantViolationException("Você não tem permissão para acessar clientes de outro vendedor ou não atribuídos.");
            }
        }
    }

    private String normalizarDocumento(String doc) {
        if (doc == null || doc.isBlank()) return null;
        return doc.replaceAll("[^0-9]", "");
    }
}