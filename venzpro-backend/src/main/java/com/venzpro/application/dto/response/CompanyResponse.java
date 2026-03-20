package com.venzpro.application.dto.response;

import com.venzpro.domain.entity.Company;
import java.time.LocalDateTime;
import java.util.UUID;

public record CompanyResponse(UUID id, String nome, UUID organizationId, LocalDateTime createdAt) {
    public static CompanyResponse from(Company c) {
        return new CompanyResponse(c.getId(), c.getNome(), c.getOrganization().getId(), c.getCreatedAt());
    }
}
