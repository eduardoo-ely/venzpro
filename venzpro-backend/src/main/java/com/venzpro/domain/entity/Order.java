package com.venzpro.domain.entity;

import com.venzpro.domain.enums.OrderStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Entidade de Pedido do VenzPro.
 *
 * Estende {@link BaseTenantEntity} para herdar:
 * id, organizationId (isolamento multi-tenant), auditoria e soft-delete.
 *
 * <h3>Fluxo de status</h3>
 * As transições válidas são:
 * <pre>
 *   ORCAMENTO → ENVIADO | CANCELADO
 *   ENVIADO   → APROVADO | REJEITADO | CANCELADO
 *   APROVADO  → CONCLUIDO | CANCELADO  (cancelamento exige motivo)
 *   REJEITADO → (terminal)
 *   CONCLUIDO → (terminal — não pode ser cancelado)
 *   CANCELADO → (terminal)
 * </pre>
 * A validação das transições é responsabilidade do {@code OrderService}.
 *
 * <h3>Cálculo do total</h3>
 * O total é sempre calculado pelo backend via {@link #recalcularTotal()}.
 * O frontend nunca define o valor final (Regra 14).
 */
@Entity
@Table(
    name = "orders",
    indexes = {
        @Index(name = "idx_orders_org",    columnList = "organization_id"),
        @Index(name = "idx_orders_status", columnList = "organization_id, status"),
        @Index(name = "idx_orders_user",   columnList = "organization_id, user_id"),
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order extends BaseTenantEntity {

    // ── Relacionamentos ───────────────────────────────────────────────────────
    // organizationId herdado de BaseTenantEntity — não repetir aqui.

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    /** Vendedor responsável pelo pedido. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // ── Dados do pedido ───────────────────────────────────────────────────────

    @Column(name = "valor_total", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal valorTotal = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private OrderStatus status = OrderStatus.ORCAMENTO;

    @Column(columnDefinition = "TEXT")
    private String descricao;

    // ── Auditoria de cancelamento ─────────────────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cancelado_por")
    private User canceladoPor;

    @Column(name = "cancelado_em")
    private Instant canceladoEm;

    @Column(name = "motivo_cancelamento", columnDefinition = "TEXT")
    private String motivoCancelamento;

    // ── Itens ─────────────────────────────────────────────────────────────────

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderItem> itens = new ArrayList<>();

    // ── Métodos de domínio ────────────────────────────────────────────────────

    /**
     * Adiciona um item ao pedido e mantém a referência bidirecional.
     *
     * @param item o item a ser adicionado; não pode ser nulo.
     */
    public void addItem(OrderItem item) {
        itens.add(item);
        item.setOrder(this);
    }

    /**
     * Remove todos os itens do pedido.
     * Usado antes de reaplicar os itens em operações de edição.
     */
    public void clearItens() {
        itens.forEach(item -> item.setOrder(null));
        itens.clear();
    }

    /**
     * Recalcula o valor total somando {@code precoUnitario × quantidade}
     * de todos os itens válidos.
     *
     * Deve ser chamado após qualquer alteração nos itens e antes de persistir.
     * O backend é sempre a fonte autoritativa do total (Regra 14).
     */
    public void recalcularTotal() {
        this.valorTotal = itens.stream()
            .filter(item ->
                item != null &&
                item.getPrecoUnitario() != null &&
                item.getQuantidade()    != null
            )
            .map(item -> item.getPrecoUnitario().multiply(item.getQuantidade()))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Registra o cancelamento do pedido.
     * Não valida a transição de status — isso é responsabilidade do serviço.
     *
     * @param responsavel usuário que solicitou o cancelamento.
     * @param motivo      justificativa obrigatória para pedidos APROVADOS.
     */
    public void registrarCancelamento(User responsavel, String motivo) {
        this.canceladoPor        = responsavel;
        this.canceladoEm         = Instant.now();
        this.motivoCancelamento  = motivo;
        this.status              = OrderStatus.CANCELADO;
    }
}
