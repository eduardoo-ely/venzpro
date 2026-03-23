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
import com.venzpro.domain.repository.CustomerOwnerHistoryRepository;
import com.venzpro.domain.repository.CustomerRepository;
import com.venzpro.domain.repository.OrganizationRepository;
import com.venzpro.domain.repository.UserRepository;
import com.venzpro.infrastructure.exception.BusinessException;
import com.venzpro.infrastructure.exception.ResourceNotFoundException;
import com.venzpro.infrastructure.security.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository             customerRepository;
    private final UserRepository                 userRepository;
    private final OrganizationRepository         organizationRepository;
    private final CustomerOwnerHistoryRepository ownerHistoryRepository;
    private final AuditService                   auditService;

    // ── Constantes de auditoria ───────────────────────────────────────────────
    private static final String APPROVE_CUSTOMER  = "APPROVE_CUSTOMER";
    private static final String REJECT_CUSTOMER   = "REJECT_CUSTOMER";
    private static final String ASSIGN_OWNER      = "ASSIGN_OWNER";
    private static final String UNASSIGN_OWNER    = "UNASSIGN_OWNER";

    // ── CREATE ────────────────────────────────────────────────────────────────

    @Transactional
    public CustomerResponse create(CustomerRequest req, UUID userId) {
        UUID orgId = TenantContext.get();

        var user = userRepository.findByIdForCurrentTenant(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", userId));
        var org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organização", orgId));

        var customer = Customer.builder()
                .nome(req.nome())
                .telefone(req.telefone())
                .email(req.email())
                .cidade(req.cidade())
                .cpfCnpj(normalizarDocumento(req.cpfCnpj()))
                .owner(user)
                .createdBy(user)
                .organization(org)
                .build();

        return CustomerResponse.from(customerRepository.save(customer));
    }

    // ── READ ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<CustomerResponse> findAll() {
        return customerRepository.findAllForCurrentTenant()
                .stream().map(CustomerResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public CustomerResponse findById(UUID id) {
        return CustomerResponse.from(customerRepository.getByIdOrThrow(id, "Cliente"));
    }

    // ── UPDATE DADOS ──────────────────────────────────────────────────────────

    @Transactional
    public CustomerResponse update(UUID id, CustomerRequest req) {
        var customer = customerRepository.getByIdOrThrow(id, "Cliente");

        customer.setNome(req.nome());
        customer.setTelefone(req.telefone());
        customer.setEmail(req.email());
        customer.setCidade(req.cidade());

        if (req.cpfCnpj() != null) {
            customer.setCpfCnpj(normalizarDocumento(req.cpfCnpj()));
        }
        if (req.status() != null) {
            customer.setStatus(req.status());
        }

        return CustomerResponse.from(customerRepository.save(customer));
    }

    // ── UPDATE STATUS (APROVAÇÃO / REJEIÇÃO) ──────────────────────────────────

    /**
     * Altera o status de um cliente.
     *
     * Regras aplicadas:
     *  - Apenas ADMIN e GERENTE (dupla camada: @PreAuthorize + validação aqui)
     *  - Somente PENDENTE pode ser aprovado ou rejeitado
     *  - Rejeição exige motivo
     *  - Auditoria registrada com ação específica
     */
    @Transactional
    public CustomerResponse updateStatus(UUID id,
                                         UUID organizationId,
                                         UUID requesterId,
                                         UserRole requesterRole,
                                         CustomerStatusRequest req) {

        if (requesterRole != UserRole.ADMIN && requesterRole != UserRole.GERENTE) {
            throw new BusinessException("Apenas ADMIN ou GERENTE podem alterar o status de clientes.");
        }

        var customer = customerRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", id));

        if (customer.getStatus() != CustomerStatus.PENDENTE) {
            throw new BusinessException(
                    "Somente clientes com status PENDENTE podem ser aprovados ou rejeitados. " +
                            "Status atual: " + customer.getStatus()
            );
        }

        if (req.status() == CustomerStatus.REJEITADO &&
                (req.motivo() == null || req.motivo().isBlank())) {
            throw new BusinessException("O motivo é obrigatório ao rejeitar um cliente.");
        }

        customer.setStatus(req.status());
        var saved = customerRepository.save(customer);

        String acao     = req.status() == CustomerStatus.APROVADO ? APPROVE_CUSTOMER : REJECT_CUSTOMER;
        String detalhes = "Cliente: " + customer.getNome()
                + (req.motivo() != null ? " | Motivo: " + req.motivo() : "");
        auditService.log(organizationId, requesterId, acao, "Customer", id, detalhes);

        return CustomerResponse.from(saved);
    }

    // ── UPDATE OWNER (CARTEIRA) ───────────────────────────────────────────────
@Transactional
    public CustomerResponse updateOwner(UUID id,
                                        UUID organizationId,
                                        UUID requesterId,
                                        UserRole requesterRole,
                                        CustomerOwnerRequest req) {

        // Camada de defesa adicional no service
        if (requesterRole != UserRole.ADMIN && requesterRole != UserRole.GERENTE) {
            throw new BusinessException("Apenas ADMIN ou GERENTE podem redistribuir a carteira de clientes.");
        }

        // Busca o cliente garantindo isolamento multi-tenant
        var customer = customerRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", id));

        // Busca o usuário que está executando a operação (para o histórico)
        var changedBy = userRepository.findByIdAndOrganizationId(requesterId, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", requesterId));

        // Captura o owner anterior ANTES de sobrescrever (necessário para o histórico)
        User oldOwner = customer.getOwner();

        // Resolve o novo owner (null = desatribuição)
        User newOwner = null;
        if (req.ownerId() != null) {
            newOwner = userRepository.findByIdAndOrganizationId(req.ownerId(), organizationId)
                    .orElseThrow(() -> new ResourceNotFoundException("Usuário", req.ownerId()));

            // ADMIN não deve ter carteira de clientes — só VENDEDOR e GERENTE
            if (newOwner.getRole() == UserRole.ADMIN) {
                throw new BusinessException(
                        "Usuários com role ADMIN não podem ser responsáveis por clientes. " +
                                "Selecione um VENDEDOR ou GERENTE."
                );
            }

            // Evita reatribuição desnecessária para o mesmo owner
            if (oldOwner != null && oldOwner.getId().equals(newOwner.getId())) {
                throw new BusinessException(
                        "O cliente já está atribuído para este responsável."
                );
            }
        }

        // ── Operação 1: atualiza o owner no cliente ───────────────────────────
        customer.setOwner(newOwner);
        var saved = customerRepository.save(customer);

        // ── Operação 2: grava o histórico de troca ────────────────────────────
        ownerHistoryRepository.save(
                CustomerOwnerHistory.builder()
                        .customer(saved)
                        .oldOwner(oldOwner)
                        .newOwner(newOwner)
                        .changedBy(changedBy)
                        .build()
        );

        // ── Auditoria assíncrona ──────────────────────────────────────────────
        // @Async no AuditService — não bloqueia a transação principal
        String acao = (newOwner != null) ? ASSIGN_OWNER : UNASSIGN_OWNER;
        String detalhes = "Cliente: " + customer.getNome()
                + " | Anterior: " + (oldOwner != null ? oldOwner.getNome() : "nenhum")
                + " | Novo: "     + (newOwner != null ? newOwner.getNome() : "nenhum");
        auditService.log(organizationId, requesterId, acao, "Customer", id, detalhes);

        return CustomerResponse.from(saved);
    }

    // ── DELETE ────────────────────────────────────────────────────────────────

    @Transactional
    public void delete(UUID id) {
        var customer = customerRepository.getByIdOrThrow(id, "Cliente");
        customerRepository.delete(customer);
    }

    // ── HELPERS ───────────────────────────────────────────────────────────────

    private String normalizarDocumento(String doc) {
        if (doc == null || doc.isBlank()) return null;
        return doc.replaceAll("[^0-9]", "");
    }
}