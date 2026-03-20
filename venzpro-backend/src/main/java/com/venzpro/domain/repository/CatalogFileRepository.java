package com.venzpro.domain.repository;

import com.venzpro.domain.entity.CatalogFile;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CatalogFileRepository extends TenantAwareRepository<CatalogFile> {
    List<CatalogFile> findAllByOrganizationId(UUID organizationId);
    List<CatalogFile> findAllByCompanyId(UUID companyId);
    List<CatalogFile> findAllByCompanyIdAndOrganizationId(UUID companyId, UUID organizationId);
    Optional<CatalogFile> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
