package com.venzpro.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entidade de empresa (representada / fornecedora).
 *
 * Campos de CNPJ e endereço adicionados na V2__Companies_Add_CNPJ_Address.sql.
 * Preenchidos via BrasilAPI no frontend (EmpresasPage) e persistidos corretamente
 * a partir desta versão — corrige o bug de dados silenciosamente descartados.
 */
@Entity
@Table(
        name = "companies",
        uniqueConstraints = {
                // CNPJ único por organização (parcial — apenas quando informado)
                // O constraint de unicidade real está no índice parcial da migration.
                // Aqui registramos apenas para documentação — o banco aplica a regra.
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Company {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // ── Identificação ─────────────────────────────────────────────────────────

    @Column(nullable = false, length = 200)
    private String nome;

    /** CNPJ formatado: XX.XXX.XXX/XXXX-XX — opcional, preenchido via BrasilAPI */
    @Column(length = 18)
    private String cnpj;

    /** Razão social conforme Receita Federal */
    @Column(name = "razao_social", length = 300)
    private String razaoSocial;

    // ── Endereço ──────────────────────────────────────────────────────────────

    @Column(length = 9)
    private String cep;

    @Column(length = 300)
    private String logradouro;

    @Column(length = 20)
    private String numero;

    @Column(length = 100)
    private String complemento;

    @Column(length = 100)
    private String bairro;

    @Column(length = 100)
    private String cidade;

    /** UF — sigla do estado, 2 caracteres */
    @Column(length = 2)
    private String uf;

    // ── Relacionamento e auditoria ────────────────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}