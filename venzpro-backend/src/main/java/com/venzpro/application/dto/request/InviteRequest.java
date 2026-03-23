package com.venzpro.application.dto.request;

import com.venzpro.domain.enums.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * DTO de entrada para POST /api/invites
 *
 * Apenas ADMIN pode convidar — gera senha temporária.
 * Usuário criado com mustChangePassword=true.
 *
 * organizationId NUNCA vem aqui — vem do JWT via TenantContext.
 */
public record InviteRequest(

    @NotBlank(message = "Nome é obrigatório")
    @Size(min = 2, max = 100, message = "Nome deve ter entre 2 e 100 caracteres")
    String nome,

    @NotBlank(message = "Email é obrigatório")
    @Email(message = "Email inválido")
    String email,

    UserRole role

) {}
