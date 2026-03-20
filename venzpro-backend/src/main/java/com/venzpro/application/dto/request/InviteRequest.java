package com.venzpro.application.dto.request;

import com.venzpro.domain.enums.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record InviteRequest(
    @NotBlank(message = "Nome obrigatório") String nome,
    @Email(message = "Email inválido") @NotBlank String email,
    UserRole role
) {}
