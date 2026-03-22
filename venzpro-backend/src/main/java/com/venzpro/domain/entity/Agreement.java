package com.venzpro.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "agreements", uniqueConstraints = {
    @UniqueConstraint(name = "uq_agreements_rep_emp", columnNames = {"representante_org_id", "empresa_company_id"})
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Agreement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "representante_org_id", nullable = false)
    private Organization representante;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "empresa_company_id", nullable = false)
    private Company empresa;

    @Column(name = "percentual_comissao", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal percentualComissao = BigDecimal.ZERO;

    @Column(name = "compartilhar_pedidos", nullable = false)
    @Builder.Default
    private boolean compartilharPedidos = false;

    @Column(name = "compartilhar_dashboard", nullable = false)
    @Builder.Default
    private boolean compartilharDashboard = false;

    @Column(name = "compartilhar_clientes", nullable = false)
    @Builder.Default
    private boolean compartilharClientes = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean ativo = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
