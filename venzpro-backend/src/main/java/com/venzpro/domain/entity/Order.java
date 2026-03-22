package com.venzpro.domain.entity;

import com.venzpro.domain.enums.OrderStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "orders")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(name = "valor_total", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal valorTotal = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private OrderStatus status = OrderStatus.ORCAMENTO;

    @Column(name = "motivo_cancelamento", columnDefinition = "TEXT")
    private String motivoCancelamento;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cancelado_por")
    private User canceladoPor;

    @Column(name = "cancelado_em")
    private OffsetDateTime canceladoEm;

    @Column(name = "motivo_cancelamento", columnDefinition = "TEXT")
    private String motivoCancelamento;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cancelado_por")
    private User canceladoPor;

    @Column(name = "cancelado_em")
    private OffsetDateTime canceladoEm;

    @Column(columnDefinition = "TEXT")
    private String descricao;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderItem> itens = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public void addItem(OrderItem item) {
        itens.add(item);
        item.setOrder(this);
    }

    public void clearItens() {
        for (OrderItem item : itens) {
            item.setOrder(null);
        }
        itens.clear();
    }

    public void recalcularTotal() {
        this.valorTotal = itens.stream()
                .map(item -> item.getPrecoUnitario().multiply(item.getQuantidade()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
