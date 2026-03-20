package com.venzpro.domain.repository;

import com.venzpro.domain.entity.Company;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompanyRepository extends TenantAwareRepository<Company> {
    List<Company> findAllByOrganizationId(UUID organizationId);
    boolean existsByIdAndOrganizationId(UUID id, UUID organizationId);
    Optional<Company> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
