package com.venzpro.application.dto.response;

import com.venzpro.domain.entity.Customer;
import java.time.LocalDateTime;
import java.util.UUID;

public record CustomerResponse(
    UUID id, String nome, String telefone, String email,
    String cidade, UUID userId, UUID organizationId, LocalDateTime createdAt
) {
    public static CustomerResponse from(Customer c) {
        return new CustomerResponse(
            c.getId(), c.getNome(), c.getTelefone(), c.getEmail(),
            c.getCidade(), c.getUser().getId(), c.getOrganization().getId(), c.getCreatedAt()
        );
    }
}
