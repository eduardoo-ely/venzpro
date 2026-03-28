package com.venzpro.domain.repository;

import com.venzpro.domain.entity.Order;
import com.venzpro.domain.enums.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends TenantAwareRepository<Order> {

    // ── Listagem paginada — Admin / Gerente ───────────────────────────────────
    Page<Order> findAllByOrganizationIdAndDeletedAtIsNull(UUID organizationId, Pageable pageable);
    Page<Order> findAllByOrganizationIdAndStatusAndDeletedAtIsNull(UUID organizationId, OrderStatus status, Pageable pageable);

    // ── Busca por ID ──────────────────────────────────────────────────────────
    Optional<Order> findByIdAndOrganizationIdAndDeletedAtIsNull(UUID id, UUID organizationId);

    // ── Listagem paginada — Vendedor ──────────────────────────────────────────
    Page<Order> findAllByOrganizationIdAndUserIdAndDeletedAtIsNull(UUID organizationId, UUID userId, Pageable pageable);
    Page<Order> findAllByOrganizationIdAndStatusAndUserIdAndDeletedAtIsNull(UUID organizationId, OrderStatus status, UUID userId, Pageable pageable);

    // ── Guards de dependência ─────────────────────────────────────────────────

    /**
     * Verifica se existe algum pedido não-deletado vinculado a uma empresa.
     * Usado em CompanyService.delete() para impedir exclusão com pedidos ativos.
     */
    boolean existsByCompanyIdAndDeletedAtIsNull(UUID companyId);

    /**
     * Conta pedidos de um cliente cujo status está na lista fornecida.
     * Usado em CustomerService.delete() para bloquear exclusão com pedidos em aberto.
     * Status não-terminais: ORCAMENTO, ENVIADO, APROVADO.
     */
    long countByCustomerIdAndStatusIn(UUID customerId, List<OrderStatus> statuses);
}