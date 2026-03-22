package com.venzpro.domain.repository;

import com.venzpro.domain.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repositório de produtos com isolamento multi-tenant rigoroso.
 *
 * TODOS os métodos filtram por organizationId.
 * Nunca exponha métodos que retornem produtos de outras organizações.
 *
 * Paginação: todos os listagens usam Page<Product> + Pageable para
 * garantir performance com catálogos grandes.
 */
public interface ProductRepository extends JpaRepository<Product, UUID> {

    // ── Listagem com paginação ────────────────────────────────────────────────

    /**
     * Lista todos os produtos activos de uma organização, com paginação.
     * Uso típico: GET /api/products?page=0&size=20&sort=nome,asc
     */
    Page<Product> findAllByOrganizationIdAndAtivoTrue(UUID organizationId, Pageable pageable);

    /**
     * Lista todos os produtos (activos e inactivos) — para uso administrativo.
     */
    Page<Product> findAllByOrganizationId(UUID organizationId, Pageable pageable);

    /**
     * Filtra por empresa (company) dentro da organização, com paginação.
     * Útil para mostrar catálogo de um fornecedor específico.
     */
    Page<Product> findAllByOrganizationIdAndCompanyIdAndAtivoTrue(
            UUID organizationId,
            UUID companyId,
            Pageable pageable
    );

    // ── Busca individual (garante isolamento) ─────────────────────────────────

    /**
     * Equivalente a findById(), mas garante que o produto pertence à organização.
     * NUNCA use findById() directamente — usaria este método.
     */
    Optional<Product> findByIdAndOrganizationId(UUID id, UUID organizationId);

    // ── Pesquisa full-text ────────────────────────────────────────────────────

    /**
     * Pesquisa por nome ou descrição dentro da organização.
     * LIKE case-insensitive (ILIKE no PostgreSQL).
     */
    @Query("""
        SELECT p FROM Product p
        WHERE p.organizationId = :orgId
          AND p.ativo = true
          AND (LOWER(p.nome) LIKE LOWER(CONCAT('%', :termo, '%'))
               OR LOWER(p.descricao) LIKE LOWER(CONCAT('%', :termo, '%')))
        """)
    Page<Product> searchByTermo(
            @Param("orgId") UUID organizationId,
            @Param("termo") String termo,
            Pageable pageable
    );

    // ── Para exportação (sem paginação — stream todo o catálogo) ─────────────

    /**
     * Retorna todos os produtos activos para exportação CSV/Excel.
     * Sem paginação — usar com cautela; o serviço deve limitar por organização.
     *
     * Para catálogos muito grandes (>50k produtos), considere usar
     * {@link org.springframework.data.jpa.repository.JpaRepository#findAll()}
     * com ScrollableResults / Stream.
     */
    @Query("SELECT p FROM Product p WHERE p.organizationId = :orgId AND p.ativo = true ORDER BY p.nome")
    List<Product> findAllForExport(@Param("orgId") UUID organizationId);

    // ── Utilitários ───────────────────────────────────────────────────────────

    /** Verifica existência sem carregar a entidade. */
    boolean existsByIdAndOrganizationId(UUID id, UUID organizationId);

    /** Conta activos por organização (usado no dashboard). */
    long countByOrganizationIdAndAtivoTrue(UUID organizationId);

    /**
     * Actualiza apenas o preço base via JPQL para evitar carregar a entidade completa.
     * Usado pelo ProductService.patchPrice() em operações de alta frequência.
     *
     * @Modifying + @Transactional no serviço — o repositório não gerencia transacções.
     */
    @Modifying
    @Query("""
        UPDATE Product p
        SET p.precoBase = :preco
        WHERE p.id = :id
          AND p.organizationId = :orgId
        """)
    int updatePrecoByIdAndOrganizationId(
            @Param("id")     UUID id,
            @Param("orgId")  UUID organizationId,
            @Param("preco")  BigDecimal preco
    );
}