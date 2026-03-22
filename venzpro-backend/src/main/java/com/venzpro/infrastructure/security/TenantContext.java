package com.venzpro.infrastructure.security;

import java.util.UUID;

/**
 * Armazena o organizationId do usuário autenticado na thread atual.
 *
 * Populado pelo JwtAuthenticationFilter após validar o token.
 * Consumido pelos Services e pelo TenantAwareRepository.
 *
 * ThreadLocal é seguro em ambientes Servlet (um thread por request).
 * Em contextos reativos (WebFlux), substituir por Reactor Context.
 */
public final class TenantContext {

    private static final ThreadLocal<UUID> CURRENT_ORG = new ThreadLocal<>();

    private TenantContext() {}

    public static void set(UUID organizationId) {
        CURRENT_ORG.set(organizationId);
    }

    public static UUID get() {
        UUID id = CURRENT_ORG.get();
        if (id == null) {
            throw new IllegalStateException(
                "TenantContext não inicializado — request sem autenticação JWT?");
        }
        return id;
    }

    /** Retorna null em vez de lançar exceção — use em contextos opcionais */
    public static UUID getOrNull() {
        return CURRENT_ORG.get();
    }

    /** DEVE ser chamado no finally do filtro para evitar memory leak */
    public static void clear() {
        CURRENT_ORG.remove();
    }
}
