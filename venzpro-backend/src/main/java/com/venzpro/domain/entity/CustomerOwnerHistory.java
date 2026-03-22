package com.venzpro.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "customer_owner_history")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CustomerOwnerHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "old_owner_id")
    private User oldOwner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "new_owner_id")
    private User newOwner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by", nullable = false)
    private User changedBy;

    @CreationTimestamp
    @Column(name = "changed_at", updatable = false)
    private OffsetDateTime changedAt;
}
