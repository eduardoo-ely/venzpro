package com.venzpro.application.dto.request;

import com.venzpro.domain.enums.UnidadeMedida;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.UUID;

public record ProductRequest(

        UUID companyId,

        @NotBlank(message = "Nome é obrigatório")
        @Size(max = 200, message = "Nome deve ter no máximo 200 caracteres")
        String nome,

        @Size(max = 5000, message = "Descrição demasiado longa")
        String descricao,

        @NotNull(message = "Preço base é obrigatório")
        @DecimalMin(value = "0.0", message = "Preço não pode ser negativo")
        @Digits(integer = 11, fraction = 4, message = "Formato de preço inválido")
        BigDecimal precoBase,

        @NotNull(message = "Unidade de medida é obrigatória")
        UnidadeMedida unidade,

        @Size(max = 100, message = "SKU deve ter no máximo 100 caracteres")
        String codigoSku

) {}