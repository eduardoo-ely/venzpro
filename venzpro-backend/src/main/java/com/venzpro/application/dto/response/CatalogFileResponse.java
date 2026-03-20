package com.venzpro.application.dto.response;

import com.venzpro.domain.entity.CatalogFile;
import com.venzpro.domain.enums.FileType;
import java.time.LocalDateTime;
import java.util.UUID;

public record CatalogFileResponse(
    UUID id, UUID companyId, String empresaNome,
    UUID organizationId, String nome, String url,
    FileType tipo, LocalDateTime createdAt
) {
    public static CatalogFileResponse from(CatalogFile f) {
        return new CatalogFileResponse(
            f.getId(), f.getCompany().getId(), f.getCompany().getNome(),
            f.getOrganization().getId(), f.getNome(), f.getUrl(),
            f.getTipo(), f.getCreatedAt()
        );
    }
}
