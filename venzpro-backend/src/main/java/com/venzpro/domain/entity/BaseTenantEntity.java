package com.venzpro.domain.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

/**
 * Superclasse mapeada para todas as entidades principais do VenzPro.
 *
 * Centraliza os campos de auditoria e isolamento multi-tenant:
 * <ul>
 *   <li>{@code id}             — PK UUID, gerado automaticamente</li>
 *   <li>{@code organizationId} — FK do tenant; nunca nulo, nunca mutável</li>
 *   <li>{@code createdAt}      — preenchido na criação pelo JPA Auditing</li>
 *   <li>{@code updatedAt}      — atualizado em cada UPDATE pelo JPA Auditing</li>
 *   <li>{@code deletedAt}      — soft-delete; {@code null} = registro ativo</li>
 * </ul>
 *
 * <h3>Soft-delete</h3>
 * Nunca faça {@code DELETE} em entidades que estendem esta classe.
 * Use {@link #softDelete()} para marcar como excluído e
 * {@link #isDeleted()} para verificar o estado.
 *
 * <h3>Pré-requisito</h3>
 * A classe de configuração JPA deve ter {@code @EnableJpaAuditing}.
 * Ver: {@code JpaConfig.java}.
 *
 * <h3>Como estender</h3>
 * <pre>{@code
 * @Entity
 * @Table(name = "products")
 * public class Product extends BaseTenantEntity { ... }
 * }</pre>
 */
@Getter
@Setter
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseTenantEntity {

    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    /**
     * Identificador do tenant (organização).
     * Sempre extraído do JWT — nunca aceito do corpo da requisição.
     * {@code updatable = false} garante que não pode ser trocado após a criação.
     */
    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /**
     * Soft-delete: quando preenchido, o registro é considerado excluído.
     * Todos os repositórios devem filtrar por {@code deleted_at IS NULL}.
     */
    @Column(name = "deleted_at")
    private Instant deletedAt;

    // ── Ciclo de vida JPA ────────────────────────────────────────────────────

    @PrePersist
    protected void onPrePersist() {
        if (this.id == null) {
            this.id = UUID.randomUUID();
        }
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
        if (this.updatedAt == null) {
            this.updatedAt = this.createdAt;
        }
    }

    @PreUpdate
    protected void onPreUpdate() {
        this.updatedAt = Instant.now();
    }

    // ── Helpers de soft-delete ───────────────────────────────────────────────

    /**
     * Marca o registro como excluído.
     * Após chamar este método, persista a entidade normalmente via repositório.
     */
    public void softDelete() {
        this.deletedAt = Instant.now();
        this.updatedAt = this.deletedAt;
    }

    /**
     * Restaura um registro previamente excluído.
     */
    public void restore() {
        this.deletedAt = null;
        this.updatedAt = Instant.now();
    }

    /**
     * @return {@code true} se o registro foi marcado como excluído.
     */
    public boolean isDeleted() {
        return this.deletedAt != null;
    }
}
