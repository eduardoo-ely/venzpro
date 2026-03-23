package com.venzpro.application.dto.request;

import com.venzpro.domain.enums.CustomerStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * DTO de entrada para PATCH /api/customers/{id}/status
 *
 * Apenas ADMIN e GERENTE podem chamar esse endpoint.
 * O motivo é obrigatório quando o status for REJEITADO.
 */
public record CustomerStatusRequest(

        @NotNull(message = "Status é obrigatório")
        CustomerStatus status,

        @Size(max = 500, message = "Motivo deve ter no máximo 500 caracteres")
        String motivo

) {}