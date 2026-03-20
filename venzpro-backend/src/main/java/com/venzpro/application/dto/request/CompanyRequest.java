package com.venzpro.application.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CompanyRequest(
    @NotBlank(message = "Nome da empresa obrigatório")
    @Size(max = 200) String nome
) {}
