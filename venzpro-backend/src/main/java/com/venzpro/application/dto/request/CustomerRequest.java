package com.venzpro.application.dto.request;

import com.venzpro.domain.enums.CustomerStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * DTO de entrada para criação e atualização de clientes.
 *
 * Passo 2: CPF/CNPJ agora é OBRIGATÓRIO conforme roadmap.
 * O frontend integra BrasilAPI para auto-preenchimento ao digitar CNPJ.
 */
public record CustomerRequest(

        @NotBlank(message = "Nome do cliente obrigatório")
        String nome,

        @Pattern(regexp = "^[0-9\\s()+-]*$", message = "Telefone inválido")
        String telefone,

        @Email(message = "Email inválido")
        String email,

        String cidade,

        /**
         * CPF (11 dígitos) ou CNPJ (14 dígitos) — OBRIGATÓRIO.
         * Deve ser enviado apenas com dígitos (sem pontuação).
         * A normalização é feita no CustomerService antes de persistir.
         */
        @NotBlank(message = "CPF ou CNPJ é obrigatório")
        @Pattern(
                regexp = "^\\d{11}$|^\\d{14}$",
                message = "CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos (apenas números)"
        )
        String cpfCnpj,

        CustomerStatus status

) {}