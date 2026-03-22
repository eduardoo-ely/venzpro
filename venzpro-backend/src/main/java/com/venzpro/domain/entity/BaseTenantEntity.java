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
 * Superclasse mapeada para todas as entidades multi-tenant do VenzPro.
 *
 * Centraliza os campos comuns a TODAS as tabelas:
 *   - id          : PK UUID gerado automaticamente
 *   - organizationId : FK do tenant — NUNCA nulo, nunca mutável após criação
 *   - createdAt   : preenchido automaticamente pela auditoria JPA
 *   - updatedAt   : atualizado automaticamente em cada UPDATE
 *
 * Pré-requisito: a classe de configuração deve ter @EnableJpaAuditing.
 * Ver: JpaConfig.java (criado abaixo).
 *
 * Como estender:
 * <pre>
 * {@literal @}Entity
 * {@literal @}Table(name = "products")
 * public class Product extends BaseTenantEntity { ... }
 * </pre>
 */
@Getter
@Setter
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseTenantEntity {

    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

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
}