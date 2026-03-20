package com.venzpro.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "audit_log", indexes = {
    @Index(name = "idx_audit_org_date",  columnList = "organization_id, created_at"),
    @Index(name = "idx_audit_user_date", columnList = "user_id, created_at")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Organização onde a ação ocorreu */
    @Column(name = "organization_id")
    private UUID organizationId;

    /** Usuário que executou a ação (null = ação do sistema) */
    @Column(name = "user_id")
    private UUID userId;

    /** Ex: LOGIN, CREATE_ORDER, CREATE_CUSTOMER, ERROR */
    @Column(nullable = false, length = 50)
    private String action;

    /** Nome amigável da entidade afetada: "Pedido", "Cliente" */
    @Column(length = 50)
    private String entityType;

    /** ID da entidade afetada */
    @Column(name = "entity_id")
    private UUID entityId;

    /** Detalhes adicionais em texto livre */
    @Column(columnDefinition = "TEXT")
    private String details;

    /** Nível: INFO, WARN, ERROR */
    @Column(nullable = false, length = 10)
    @Builder.Default
    private String level = "INFO";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
