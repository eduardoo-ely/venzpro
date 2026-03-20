package com.venzpro.domain.repository;

import com.venzpro.domain.entity.Customer;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CustomerRepository extends TenantAwareRepository<Customer> {
    List<Customer> findAllByOrganizationId(UUID organizationId);
    Optional<Customer> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
