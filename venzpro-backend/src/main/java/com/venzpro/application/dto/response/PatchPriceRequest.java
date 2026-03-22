package com.venzpro.application.dto.request;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record PatchPriceRequest(

        @NotNull(message = "Novo preço é obrigatório")
        @DecimalMin(value = "0.0", message = "Preço não pode ser negativo")
        @Digits(integer = 11, fraction = 4, message = "Formato de preço inválido")
        BigDecimal novoPreco

) {}