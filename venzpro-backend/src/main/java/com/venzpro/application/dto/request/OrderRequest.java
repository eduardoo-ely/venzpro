package com.venzpro.application.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record OrderRequest(
    @NotNull(message = "Cliente obrigatório") UUID customerId,
    @NotNull(message = "Empresa obrigatória") UUID companyId,
    @Size(max = 2000) String descricao,
    @NotEmpty(message = "Pedido deve conter ao menos um item")
    List<@Valid OrderItemRequest> items
) {}
