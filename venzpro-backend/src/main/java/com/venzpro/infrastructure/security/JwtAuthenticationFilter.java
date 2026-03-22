package com.venzpro.infrastructure.security;

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
            TenantContext.clear();
        }
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        return (StringUtils.hasText(header) && header.startsWith("Bearer "))
                ? header.substring(7)
                : null;
    }
}