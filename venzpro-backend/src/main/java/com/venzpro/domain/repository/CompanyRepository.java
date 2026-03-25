package com.venzpro.domain.repository;

import com.venzpro.domain.entity.Company;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompanyRepository extends TenantAwareRepository<Company> {

    List<Company>     findAllByOrganizationId(UUID organizationId);
    boolean           existsByIdAndOrganizationId(UUID id, UUID organizationId);
    Optional<Company> findByIdAndOrganizationId(UUID id, UUID organizationId);

    // ── Validações de CNPJ único por organização ──────────────────────────────

    /** Verifica se já existe empresa com este CNPJ na organização (usado na criação). */
    boolean existsByCnpjAndOrganizationId(String cnpj, UUID organizationId);

    /** Verifica unicidade ao editar — exclui o próprio registro do check. */
    boolean existsByCnpjAndOrganizationIdAndIdNot(String cnpj, UUID organizationId, UUID id);
}