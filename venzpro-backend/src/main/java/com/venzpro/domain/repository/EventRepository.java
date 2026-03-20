package com.venzpro.domain.repository;

import com.venzpro.domain.entity.Event;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EventRepository extends TenantAwareRepository<Event> {
    List<Event> findAllByOrganizationId(UUID organizationId);
    Optional<Event> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
