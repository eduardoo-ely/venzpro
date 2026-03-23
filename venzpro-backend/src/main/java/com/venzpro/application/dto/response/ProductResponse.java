package com.venzpro.application.dto.response;

import com.venzpro.domain.entity.Product;
import com.venzpro.domain.enums.UnidadeMedida;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ProductResponse(
        UUID         id,
        UUID         organizationId,
        UUID         companyId,
        String       empresaNome,
        String       nome,
        String       descricao,
        BigDecimal   precoBase,
        UnidadeMedida unidade,
        Boolean      ativo,
        String       codigoSku,
        Instant      createdAt,
        Instant      updatedAt
) {
    public static ProductResponse from(Product p) {
        return new ProductResponse(
                p.getId(),
                p.getOrganizationId(),
                p.getCompany() != null ? p.getCompany().getId() : null,
                p.getCompany() != null ? p.getCompany().getNome() : null,
                p.getNome(),
                p.getDescricao(),
                p.getPrecoBase(),
                p.getUnidade(),
                p.getAtivo(),
                p.getCodigoSku() != null ? p.getCodigoSku().toString() : (String) null,                p.getCreatedAt(),
                p.getUpdatedAt()
        );
    }
}