package com.venzpro.domain.repository;

import com.venzpro.domain.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationRepository extends TenantAwareRepository<Notification> {

    Page<Notification> findAllByUserIdAndLidaFalseOrderByCreatedAtDesc(UUID userId, Pageable pageable);
    long countByUserIdAndLidaFalse(UUID userId);
    void deleteAllByOrganizationId(UUID organizationId);

    List<Notification> findAllByUserIdOrderByCreatedAtDesc(UUID userId);
    List<Notification> findAllByUserIdAndLidaFalseOrderByCreatedAtDesc(UUID userId);
    Optional<Notification> findByIdAndUserId(UUID id, UUID userId);
}