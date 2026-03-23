package com.venzpro.domain.repository;

import com.venzpro.domain.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    Page<Notification> findAllByUserIdAndLidaFalseOrderByCreatedAtDesc(
            UUID userId, Pageable pageable);

    long countByUserIdAndLidaFalse(UUID userId);

    void deleteAllByOrganizationId(UUID organizationId);
}
