package com.venzpro.application.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * DTO de entrada para criação e atualização de empresas.
 *
 * Campos de CNPJ e endereço opcionais — preenchidos via BrasilAPI no frontend.
 * Antes desta versão apenas { nome } era aceito, causando perda silenciosa de dados (bug #4).
 */
public record CompanyRequest(

        @NotBlank(message = "Nome da empresa é obrigatório")
        @Size(max = 200, message = "Nome deve ter no máximo 200 caracteres")
        String nome,

        /**
         * CNPJ formatado: XX.XXX.XXX/XXXX-XX
         * Validação de dígitos verificadores é responsabilidade do frontend (BrasilAPI já valida).
         * O backend normaliza e garante unicidade por organização via índice parcial no banco.
         */
        @Pattern(
                regexp = "^$|^\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2}$",
                message = "CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX"
        )
        String cnpj,

        @Size(max = 300, message = "Razão social deve ter no máximo 300 caracteres")
        String razaoSocial,

        @Pattern(regexp = "^$|^\\d{5}-\\d{3}$", message = "CEP deve estar no formato XXXXX-XXX")
        String cep,

        @Size(max = 300, message = "Logradouro deve ter no máximo 300 caracteres")
        String logradouro,

        @Size(max = 20, message = "Número deve ter no máximo 20 caracteres")
        String numero,

        @Size(max = 100, message = "Complemento deve ter no máximo 100 caracteres")
        String complemento,

        @Size(max = 100, message = "Bairro deve ter no máximo 100 caracteres")
        String bairro,

        @Size(max = 100, message = "Cidade deve ter no máximo 100 caracteres")
        String cidade,

        @Pattern(regexp = "^$|^[A-Z]{2}$", message = "UF deve ter 2 letras maiúsculas")
        String uf

) {}