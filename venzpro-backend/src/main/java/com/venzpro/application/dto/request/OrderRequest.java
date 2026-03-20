package com.venzpro.application.dto.request;

import com.venzpro.domain.enums.OrderStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.UUID;

public record OrderRequest(
    @NotNull(message = "Cliente obrigatório") UUID customerId,
    @NotNull(message = "Empresa obrigatória") UUID companyId,
    @DecimalMin(value = "0.0", message = "Valor não pode ser negativo") BigDecimal valorTotal,
    @NotNull(message = "Status obrigatório") OrderStatus status,
    @Size(max = 2000) String descricao
) {}
