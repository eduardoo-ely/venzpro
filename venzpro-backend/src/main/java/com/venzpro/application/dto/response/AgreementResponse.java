package com.venzpro.application.dto.response;

import com.venzpro.domain.entity.Agreement;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AgreementResponse(
        UUID id,
        UUID representanteOrgId,
        UUID empresaCompanyId,
        BigDecimal percentualComissao,
        boolean compartilharPedidos,
        boolean compartilharDashboard,
        boolean compartilharClientes,
        boolean ativo,
        OffsetDateTime createdAt
) {
    public static AgreementResponse from(Agreement a) {
        return new AgreementResponse(
                a.getId(),
                a.getRepresentante() != null ? a.getRepresentante().getId() : null,
                a.getEmpresa() != null ? a.getEmpresa().getId() : null,
                a.getPercentualComissao(),
                a.isCompartilharPedidos(),
                a.isCompartilharDashboard(),
                a.isCompartilharClientes(),
                a.isAtivo(),
                a.getCreatedAt()
        );
    }
}