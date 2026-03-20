package com.venzpro.application.dto.request;

import com.venzpro.domain.enums.UserRole;
import jakarta.validation.constraints.NotNull;

public record UpdateUserRoleRequest(
    @NotNull(message = "Role obrigatória") UserRole role
) {}
