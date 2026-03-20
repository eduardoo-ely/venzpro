package com.venzpro.domain.repository;

import com.venzpro.domain.entity.User;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends TenantAwareRepository<User> {
    List<User> findAllByOrganizationId(UUID organizationId);
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    Optional<User> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
