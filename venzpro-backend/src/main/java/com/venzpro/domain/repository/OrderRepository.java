package com.venzpro.domain.repository;

import com.venzpro.domain.entity.Order;
import com.venzpro.domain.enums.OrderStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends TenantAwareRepository<Order> {
    List<Order> findAllByOrganizationId(UUID organizationId);
    List<Order> findAllByOrganizationIdAndStatus(UUID organizationId, OrderStatus status);
    Optional<Order> findByIdAndOrganizationId(UUID id, UUID organizationId);

    // Filtros de Carteira para o Vendedor
    List<Order> findAllByOrganizationIdAndUserId(UUID organizationId, UUID userId);
    List<Order> findAllByOrganizationIdAndStatusAndUserId(UUID organizationId, OrderStatus status, UUID userId);
}