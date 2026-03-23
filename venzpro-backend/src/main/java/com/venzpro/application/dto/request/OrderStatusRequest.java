package com.venzpro.application.dto.request;

import com.venzpro.domain.enums.OrderStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record OrderStatusRequest(

        @NotNull(message = "Status é obrigatório")
        OrderStatus status,

        @Size(max = 1000, message = "Motivo deve ter no máximo 1000 caracteres")
        String motivo

) {}