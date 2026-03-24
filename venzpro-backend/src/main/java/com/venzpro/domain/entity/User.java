package com.venzpro.domain.entity;

import com.venzpro.domain.enums.UserRole;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/**
 * Entidade de usuário do VenzPro.
 *
 * Estende {@link BaseTenantEntity} para herdar:
 * id, organizationId, createdAt, updatedAt e deletedAt (soft-delete).
 *
 * Implementa {@link UserDetails} para integração com Spring Security.
 * O campo {@code senha} armazena sempre o hash BCrypt — nunca texto claro.
 */
@Entity
@Table(
    name = "users",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_users_email", columnNames = "email")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends BaseTenantEntity implements UserDetails {

    @Column(nullable = false, length = 200)
    private String nome;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    /** Hash BCrypt — nunca armazenar em texto claro. */
    @Column(nullable = false)
    private String senha;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role;

    // ── Permissões granulares ─────────────────────────────────────────────────
    // Sobrescrevem o role para ações específicas de negócio.

    /** Pode aprovar clientes da geladeira (sair do status PENDENTE). */
    @Column(name = "pode_aprovar", nullable = false)
    @Builder.Default
    private boolean podeAprovar = false;

    /** Pode exportar relatórios (CSV / Excel). */
    @Column(name = "pode_exportar", nullable = false)
    @Builder.Default
    private boolean podeExportar = false;

    /** Pode visualizar o dashboard financeiro. */
    @Column(name = "pode_ver_dashboard", nullable = false)
    @Builder.Default
    private boolean podeVerDashboard = false;

    // ── Controles de acesso ───────────────────────────────────────────────────

    /**
     * Usuários convidados recebem senha temporária e devem trocá-la
     * no primeiro acesso.
     */
    @Column(name = "must_change_password", nullable = false)
    @Builder.Default
    private boolean mustChangePassword = false;

    /**
     * Controla o passo a passo de onboarding obrigatório (Regra 5).
     * Enquanto {@code false}, o banner de onboarding é exibido no frontend.
     * Definido como {@code true} após o usuário concluir o fluxo guiado.
     *
     * O admin de seed já inicia com {@code true} para não bloquear o demo.
     * Usuários criados via invite iniciam com {@code false}.
     */
    @Column(name = "onboarding_completed", nullable = false)
    @Builder.Default
    private boolean onboardingCompleted = false;

    // ── Relacionamento com a organização ─────────────────────────────────────
    // Mantido como @ManyToOne para facilitar joins, mas o organizationId
    // da superclasse é a fonte autoritativa para isolamento multi-tenant.

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", insertable = false, updatable = false)
    private Organization organization;

    // ── UserDetails ───────────────────────────────────────────────────────────

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override public String  getPassword()              { return senha; }
    @Override public String  getUsername()              { return email; }
    @Override public boolean isAccountNonExpired()      { return !isDeleted(); }
    @Override public boolean isAccountNonLocked()       { return !isDeleted(); }
    @Override public boolean isCredentialsNonExpired()  { return true; }
    @Override public boolean isEnabled()                { return !isDeleted(); }
}
