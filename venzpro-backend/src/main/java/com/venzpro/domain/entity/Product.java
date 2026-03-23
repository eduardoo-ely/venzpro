package com.venzpro.domain.entity;

import com.venzpro.domain.enums.UnidadeMedida;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(
        name = "products",
        indexes = {
                @Index(name = "idx_products_org",    columnList = "organization_id"),
                @Index(name = "idx_products_org_co", columnList = "organization_id, company_id"),
                @Index(name = "idx_products_ativo",  columnList = "organization_id, ativo"),
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_products_sku_org", columnNames = {"organization_id", "codigo_sku"})
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = true)
    private Company company;

    @Column(nullable = false, length = 200)
    private String nome;

    @Column(columnDefinition = "TEXT")
    private String descricao;

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

    @Column(name = "codigo_sku", length = 100)
    private String codigoSku;

    // ── Conveniência ──────────────────────────────────────────────────────────

    public void ativar()     { this.ativo = true;  }

    public void desativar()  { this.ativo = false; }

    public void alterarPreco(BigDecimal novoPreco) {
        if (novoPreco == null || novoPreco.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Preço não pode ser negativo.");
        }
        this.precoBase = novoPreco;
    }
}