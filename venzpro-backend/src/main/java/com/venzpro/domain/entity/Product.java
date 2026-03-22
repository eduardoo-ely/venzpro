package com.venzpro.domain.entity;

import com.venzpro.domain.enums.UnidadeMedida;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Entidade Product — catálogo de produtos/serviços da organização.
 *
 * Herda de {@link BaseTenantEntity}:
 *   - id (UUID)
 *   - organizationId (UUID, imutável)
 *   - createdAt (Instant, auto)
 *   - updatedAt (Instant, auto)
 *
 * Isolamento multi-tenant garantido em 3 camadas:
 *   1. organizationId imutável na BaseTenantEntity
 *   2. ProductRepository filtra sempre por organizationId
 *   3. TenantIsolationAspect valida antes de cada save/delete
 */
@Entity
@Table(
        name = "products",
        indexes = {
                @Index(name = "idx_products_org",    columnList = "organization_id"),
                @Index(name = "idx_products_org_co", columnList = "organization_id, company_id"),
                @Index(name = "idx_products_ativo",  columnList = "organization_id, ativo"),
        },
        uniqueConstraints = {
                // SKU único dentro de cada organização (NULLs não violam UNIQUE em SQL)
                @UniqueConstraint(name = "uq_products_sku_org", columnNames = {"organization_id", "codigo_sku"})
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product extends BaseTenantEntity {

    /**
     * Empresa à qual este produto pertence.
     * NULL = produto pertence a toda a organização (catálogo global).
     * NOT NULL = produto específico de um fornecedor/empresa.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = true)
    private Company company;

    @Column(nullable = false, length = 200)
    private String nome;

    @Column(columnDefinition = "TEXT")
    private String descricao;

    /**
     * Preço de tabela/catálogo.
     * NOTA: em OrderItem, salvamos preco_aplicado (BigDecimal) — nunca apenas a FK do produto.
     * Isso garante imutabilidade histórica do preço no momento do pedido.
     * Ver comentário no ProductController.patchPrice() para mais detalhes.
     */
    @Column(name = "preco_base", nullable = false, precision = 15, scale = 4)
    @Builder.Default
    private BigDecimal precoBase = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private UnidadeMedida unidade = UnidadeMedida.UN;

    @Column(nullable = false)
    @Builder.Default
    private Boolean ativo = Boolean.TRUE;

    /** Código interno / referência do produto. Único por organização (nullable). */
    @Column(name = "codigo_sku", length = 100)
    private UUID codigoSku; // guarda como UUID na entidade; o DDL usa VARCHAR
    // Na prática use String para SKU alfanumérico:
    // private String codigoSku;

    // ── Conveniência ──────────────────────────────────────────────────────────

    /** Activa o produto. */
    public void ativar()     { this.ativo = true;  }

    /** Desactiva o produto (soft-delete). */
    public void desativar()  { this.ativo = false; }

    /** Actualiza o preço base. Validação de negócio encapsulada aqui. */
    public void alterarPreco(BigDecimal novoPreco) {
        if (novoPreco == null || novoPreco.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Preço não pode ser negativo.");
        }
        this.precoBase = novoPreco;
    }
}