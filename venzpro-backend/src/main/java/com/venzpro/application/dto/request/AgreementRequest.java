package com.venzpro.application.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record AgreementRequest(
        @NotNull(message = "ID da Empresa é obrigatório")
        UUID empresaCompanyId,

        @NotNull(message = "Percentual de comissão é obrigatório")
        @DecimalMin("0.0") @DecimalMax("100.0")
        BigDecimal percentualComissao,

        boolean compartilharPedidos,
        boolean compartilharDashboard,
        boolean compartilharClientes
) {}