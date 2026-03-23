package com.venzpro.application.dto.request;

import com.venzpro.domain.enums.UserRole;
import jakarta.validation.constraints.NotNull;

public record UpdateUserAccessRequest(
        @NotNull(message = "O cargo é obrigatório")
        UserRole role,
        boolean podeAprovar,
        boolean podeExportar,
        boolean podeVerDashboard
) {}