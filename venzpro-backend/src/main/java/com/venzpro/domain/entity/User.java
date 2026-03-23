package com.venzpro.domain.entity;

import com.venzpro.domain.enums.UserRole;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 200)
    private String nome;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    /** Sempre armazenado como hash BCrypt — nunca em texto claro */
    @Column(nullable = false)
    private String senha;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role;

    /** Permissão granular: pode aprovar clientes da geladeira */
    @Column(name = "pode_aprovar", nullable = false)
    @Builder.Default
    private boolean podeAprovar = false;

    /** Permissão granular: pode exportar relatórios (CSV / Excel) */
    @Column(name = "pode_exportar", nullable = false)
    @Builder.Default
    private boolean podeExportar = false;

    /** Permissão granular: pode visualizar o dashboard financeiro */
    @Column(name = "pode_ver_dashboard", nullable = false)
    @Builder.Default
    private boolean podeVerDashboard = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    /** Flag para forçar troca de senha no primeiro acesso (usuários convidados) */
    @Column(name = "must_change_password", nullable = false)
    @Builder.Default
    private boolean mustChangePassword = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // ── UserDetails ───────────────────────────────────────────────────────────

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override public String  getPassword()              { return senha;  }
    @Override public String  getUsername()              { return email;  }
    @Override public boolean isAccountNonExpired()      { return true;   }
    @Override public boolean isAccountNonLocked()       { return true;   }
    @Override public boolean isCredentialsNonExpired()  { return true;   }
    @Override public boolean isEnabled()                { return true;   }
}
