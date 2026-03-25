package com.venzpro.application.dto.response;

import com.venzpro.domain.entity.Company;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO de resposta para empresas.
 * Inclui todos os campos persistidos a partir da V2 da migration.
 */
public record CompanyResponse(
        UUID          id,
        String        nome,
        String        cnpj,
        String        razaoSocial,
        String        cep,
        String        logradouro,
        String        numero,
        String        complemento,
        String        bairro,
        String        cidade,
        String        uf,
        UUID          organizationId,
        LocalDateTime createdAt
) {
    public static CompanyResponse from(Company c) {
        return new CompanyResponse(
                c.getId(),
                c.getNome(),
                c.getCnpj(),
                c.getRazaoSocial(),
                c.getCep(),
                c.getLogradouro(),
                c.getNumero(),
                c.getComplemento(),
                c.getBairro(),
                c.getCidade(),
                c.getUf(),
                c.getOrganization().getId(),
                c.getCreatedAt()
        );
    }
}