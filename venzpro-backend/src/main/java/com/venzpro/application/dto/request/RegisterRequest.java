package com.venzpro.application.dto.request;

import com.venzpro.domain.enums.OrganizationType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * DTO de entrada para o endpoint POST /api/auth/register
 *
 * Cria simultaneamente:
 *  - Uma Organization (organização do cliente)
 *  - Um User com role ADMIN (primeiro usuário = administrador)
 */
public record RegisterRequest(

    @NotBlank(message = "Nome é obrigatório")
    @Size(min = 2, max = 100, message = "Nome deve ter entre 2 e 100 caracteres")
    String nome,

    @NotBlank(message = "Email é obrigatório")
    @Email(message = "Formato de email inválido")
    String email,

    @NotBlank(message = "Senha é obrigatória")
    @Size(min = 6, max = 100, message = "Senha deve ter entre 6 e 100 caracteres")
    String senha,

    String nomeOrganizacao,

    @NotNull(message = "Tipo de organização é obrigatório")
    OrganizationType tipoOrganizacao

) {}
