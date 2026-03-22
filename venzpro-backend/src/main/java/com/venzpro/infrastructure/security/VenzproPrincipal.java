package com.venzpro.infrastructure.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.UUID;

/**
 * Principal customizado que é colocado no SecurityContext após validação do JWT.
 * Todos os controllers obtêm organizationId e userId daqui — nunca do request body.
 */
public record VenzproPrincipal(
        UUID userId,
        UUID organizationId,
        String email,
        String role,
        Collection<? extends GrantedAuthority> authorities
) implements UserDetails {

    @Override public Collection<? extends GrantedAuthority> getAuthorities() { return authorities; }
    @Override public String getPassword()  { return null; }
    @Override public String getUsername()  { return email; }
    @Override public boolean isAccountNonExpired()    { return true; }
    @Override public boolean isAccountNonLocked()     { return true; }
    @Override public boolean isCredentialsNonExpired(){ return true; }
    @Override public boolean isEnabled()              { return true; }
}
