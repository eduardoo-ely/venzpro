package com.venzpro.domain.repository;

import com.venzpro.domain.entity.Order;
import com.venzpro.domain.enums.OrderStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends TenantAwareRepository<Order> {
    // Adicione estes métodos para suportar o filtro de registros ativos
    List<Order> findAllByOrganizationIdAndDeletedAtIsNull(UUID organizationId);
    List<Order> findAllByOrganizationIdAndStatusAndDeletedAtIsNull(UUID organizationId, OrderStatus status);
    Optional<Order> findByIdAndOrganizationIdAndDeletedAtIsNull(UUID id, UUID organizationId);

    // Filtros para Vendedor
    List<Order> findAllByOrganizationIdAndUserIdAndDeletedAtIsNull(UUID organizationId, UUID userId);
    List<Order> findAllByOrganizationIdAndStatusAndUserIdAndDeletedAtIsNull(UUID organizationId, OrderStatus status, UUID userId);
}