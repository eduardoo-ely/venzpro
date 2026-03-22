package com.venzpro.application.dto.request;

import com.venzpro.domain.enums.CustomerStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CustomerRequest(
    @NotBlank(message = "Nome do cliente obrigatório") String nome,
    @Pattern(regexp = "^[0-9\\s()+-]*$", message = "Telefone inválido") String telefone,
    @Email(message = "Email inválido") String email,
    String cidade,
    String cpfCnpj,
    CustomerStatus status
) {}
