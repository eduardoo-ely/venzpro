package com.venzpro.domain.repository;

import com.venzpro.domain.entity.Order;
import com.venzpro.domain.enums.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends TenantAwareRepository<Order> {

    // Filtros Admin/Gerente (Trazendo paginado)
    Page<Order> findAllByOrganizationIdAndDeletedAtIsNull(UUID organizationId, Pageable pageable);
    Page<Order> findAllByOrganizationIdAndStatusAndDeletedAtIsNull(UUID organizationId, OrderStatus status, Pageable pageable);

    Optional<Order> findByIdAndOrganizationIdAndDeletedAtIsNull(UUID id, UUID organizationId);

    // Filtros para Vendedor (Trazendo paginado)
    Page<Order> findAllByOrganizationIdAndUserIdAndDeletedAtIsNull(UUID organizationId, UUID userId, Pageable pageable);
    Page<Order> findAllByOrganizationIdAndStatusAndUserIdAndDeletedAtIsNull(UUID organizationId, OrderStatus status, UUID userId, Pageable pageable);
}