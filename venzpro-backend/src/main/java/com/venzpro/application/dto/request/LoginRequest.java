package com.venzpro.application.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * DTO de entrada para o endpoint POST /api/auth/login
 *
 * Bean Validation garante que campos inválidos são rejeitados
 * ANTES de chegar ao service — retorna 400 automaticamente.
 */
public record LoginRequest(

    @NotBlank(message = "Email é obrigatório")
    @Email(message = "Formato de email inválido")
    String email,

    @NotBlank(message = "Senha é obrigatória")
    @Size(min = 6, message = "Senha deve ter no mínimo 6 caracteres")
    String senha

) {}
