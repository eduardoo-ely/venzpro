package com.venzpro.application.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record OrderItemRequest(
    @NotNull(message = "Produto obrigatório") UUID productId,
    @NotNull(message = "Quantidade obrigatória")
    @DecimalMin(value = "0.0001", message = "Quantidade deve ser maior que zero")
    BigDecimal quantidade
) {}
