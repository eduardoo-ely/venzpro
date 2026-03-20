package com.venzpro.domain.repository;

import com.venzpro.config.security.TenantContext;
import com.venzpro.exception.ResourceNotFoundException;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.NoRepositoryBean;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Interface base para todos os repositories multi-tenant.
 *
 * Qualquer repositório que extenda esta interface herda os métodos
 * scoped automaticamente ao organizationId do TenantContext.
 *
 * Isso garante que NENHUMA query retorne dados de outra organização,
 * independentemente de como o código de negócio chama o repositório.
 *
 * Uso:
 *   public interface CustomerRepository extends TenantAwareRepository<Customer> {}
 *
 * Os métodos "raw" do JpaRepository ainda existem mas NÃO devem ser chamados
 * fora de contexto administrativo (ex: relatórios cross-tenant).
 */
@NoRepositoryBean
public interface TenantAwareRepository<T> extends JpaRepository<T, UUID> {

    // ── Leitura ────────────────────────────────────────────────────────────────

    List<T> findAllByOrganizationId(UUID organizationId);

    Optional<T> findByIdAndOrganizationId(UUID id, UUID organizationId);

    long countByOrganizationId(UUID organizationId);

    // ── Métodos de conveniência (usam TenantContext automaticamente) ────────────

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
