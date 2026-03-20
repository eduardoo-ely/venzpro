package com.venzpro.config.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Filtro de autenticação JWT.
 *
 * Responsabilidades:
 *  1. Extrair e validar o token Bearer do header Authorization
 *  2. Construir VenzproPrincipal com userId + organizationId + role
 *  3. Registrar o principal no SecurityContext do Spring
 *  4. Registrar o organizationId no TenantContext (ThreadLocal)
 *  5. Limpar o TenantContext no finally (evita memory leak)
 *
 * O TenantContext permite que qualquer Service/Repository acesse
 * o organizationId sem precisar recebê-lo como parâmetro.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        final String token = extractToken(request);

        try {
            if (token != null && jwtService.isTokenValid(token)) {
                var userId         = jwtService.extractUserId(token);
                var organizationId = jwtService.extractOrganizationId(token);
                var email          = jwtService.extractEmail(token);
                var role           = jwtService.extractRole(token);

                // 1. Popula SecurityContext
                var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));
                var principal   = new VenzproPrincipal(userId, organizationId, email, role, authorities);
                var auth        = new UsernamePasswordAuthenticationToken(principal, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(auth);

                // 2. Popula TenantContext — disponível em toda a thread
                TenantContext.set(organizationId);

                log.debug("JWT válido: userId={} orgId={} role={}", userId, organizationId, role);
            }

            chain.doFilter(request, response);

        } finally {
            // 3. Limpeza obrigatória — evita vazamento entre requests no pool de threads
            TenantContext.clear();
            SecurityContextHolder.clearContext();
        }
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        return (StringUtils.hasText(header) && header.startsWith("Bearer "))
                ? header.substring(7)
                : null;
    }
}
