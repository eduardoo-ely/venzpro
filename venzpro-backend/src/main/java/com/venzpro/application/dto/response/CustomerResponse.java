package com.venzpro.application.dto.response;

import com.venzpro.domain.entity.Customer;
import com.venzpro.domain.enums.CustomerStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record CustomerResponse(
    UUID id,
    String nome,
    String telefone,
    String email,
    String cidade,
    String cpfCnpj,
    CustomerStatus status,
    UUID ownerId,
    UUID createdBy,
    UUID organizationId,
    LocalDateTime createdAt
) {
    public static CustomerResponse from(Customer c) {
        return new CustomerResponse(
            c.getId(),
            c.getNome(),
            c.getTelefone(),
            c.getEmail(),
            c.getCidade(),
            c.getCpfCnpj(),
            c.getStatus(),
            c.getOwner() != null ? c.getOwner().getId() : null,
            c.getCreatedBy() != null ? c.getCreatedBy().getId() : null,
            c.getOrganization().getId(),
            c.getCreatedAt()
        );
    }
}
