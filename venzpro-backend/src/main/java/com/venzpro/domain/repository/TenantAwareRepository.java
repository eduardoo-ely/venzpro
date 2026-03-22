package com.venzpro.domain.repository;

import com.venzpro.infrastructure.security.TenantContext;
import com.venzpro.infrastructure.exception.ResourceNotFoundException;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.NoRepositoryBean;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@NoRepositoryBean
public interface TenantAwareRepository<T> extends JpaRepository<T, UUID> {

    List<T> findAllByOrganizationId(UUID organizationId);

    Optional<T> findByIdAndOrganizationId(UUID id, UUID organizationId);

    long countByOrganizationId(UUID organizationId);

    default List<T> findAllForCurrentTenant() {
        return findAllByOrganizationId(TenantContext.get());
    }

    default Optional<T> findByIdForCurrentTenant(UUID id) {
        return findByIdAndOrganizationId(id, TenantContext.get());
    }

    default T getByIdOrThrow(UUID id, String entityName) {
        return findByIdForCurrentTenant(id)
                .orElseThrow(() -> new ResourceNotFoundException(entityName, id));
    }

    default long countForCurrentTenant() {
        return countByOrganizationId(TenantContext.get());
    }
}
