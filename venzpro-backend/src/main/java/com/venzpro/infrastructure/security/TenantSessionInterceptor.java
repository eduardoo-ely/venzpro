package com.venzpro.infrastructure.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Interceptor que configura a variável de sessão PostgreSQL app.current_org_id
 * para ativar o Row-Level Security no nível do banco.
 *
 * Funciona em conjunto com o JwtAuthenticationFilter:
 *   1. JwtAuthenticationFilter extrai o orgId do JWT → TenantContext
 *   2. TenantSessionInterceptor lê o TenantContext → SET LOCAL para o PostgreSQL
 *   3. Todas as queries na transaction usam o RLS automaticamente
 *
 * Esta é a TERCEIRA camada de isolamento (após o código Java e o TenantContext).
 * Garante isolamento mesmo se um desenvolvedor esquecer de filtrar por orgId.
 *
 * IMPORTANTE: Registrar este interceptor no WebMvcConfigurer.
 */
@Slf4j
@Component
public class TenantSessionInterceptor implements HandlerInterceptor {

    private final JdbcTemplate jdbc;

    public TenantSessionInterceptor(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public boolean preHandle(HttpServletRequest request,
                              HttpServletResponse response,
                              Object handler) {

        var orgId = TenantContext.getOrNull();
        if (orgId != null) {
            // SET LOCAL dura apenas durante a transaction atual
            // e é revertido automaticamente no commit/rollback
            jdbc.execute("SET LOCAL app.current_org_id = '" + orgId + "'");
            log.debug("RLS configurado para org={}", orgId);
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request,
                                 HttpServletResponse response,
                                 Object handler, Exception ex) {
        // TenantContext já é limpo pelo JwtAuthenticationFilter
        // Aqui apenas garantia extra
        TenantContext.clear();
    }
}
