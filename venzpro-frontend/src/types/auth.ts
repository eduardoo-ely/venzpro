/**
 * auth.ts — Fonte única de verdade para roles e permissões do VenzPro.
 *
 * Espelha exatamente os enums do backend:
 *   - UserRole.java
 *   - As permissões granulares da entidade User.java
 *
 * NUNCA defina roles ou permissões em outro lugar no frontend.
 * Qualquer mudança de regra de negócio começa aqui.
 */

// ── Roles (espelha UserRole.java) ─────────────────────────────────────────────

export const ROLES = ['ADMIN', 'GERENTE', 'VENDEDOR', 'SUPORTE'] as const;
export type UserRole = (typeof ROLES)[number];

// ── Permissões granulares (espelha campos booleanos de User.java) ─────────────

export const PERMISSIONS = [
    'podeAprovar',
    'podeExportar',
    'podeVerDashboard',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

// ── Hierarquia de roles ───────────────────────────────────────────────────────
// Usada pelo ProtectedRoute para lógica de "mínimo necessário".

export const ROLE_HIERARCHY: Record<UserRole, number> = {
    ADMIN:    4,
    GERENTE:  3,
    VENDEDOR: 2,
    SUPORTE:  1,
};

// ── Helpers de verificação ────────────────────────────────────────────────────

/** Verifica se um role tem privilégio igual ou superior ao role exigido. */
export function hasMinRole(userRole: UserRole, required: UserRole): boolean {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[required];
}

/** Verifica se o role do usuário está na lista de roles permitidos. */
export function hasAnyRole(userRole: UserRole, allowed: UserRole[]): boolean {
    return allowed.includes(userRole);
}

// ── Configuração de acesso por rota ──────────────────────────────────────────

/**
 * RouteAccess define as regras de acesso de uma rota protegida.
 *
 * Lógica aplicada (AND):
 *   1. `roles`       — o usuário deve ter um desses roles (se definido)
 *   2. `permissions` — o usuário deve ter TODAS essas permissões (se definido)
 *   3. `minRole`     — o usuário deve ter role >= este nível (se definido)
 *
 * Se nenhuma restrição for definida, qualquer autenticado passa.
 */
export interface RouteAccess {
    /** Roles permitidos (OR entre eles). */
    roles?: UserRole[];
    /** Permissões granulares obrigatórias (AND entre elas). */
    permissions?: Permission[];
    /** Role mínimo necessário (alternativa a `roles`). */
    minRole?: UserRole;
}

// ── Mapa de acesso por rota ──────────────────────────────────────────────────

/**
 * ROUTE_ACCESS_MAP — configuração centralizada de controlo de acesso.
 *
 * Adicionar nova rota protegida? Adicione aqui.
 * Mudar quem pode acessar o dashboard? Mude aqui.
 * Nenhuma lógica de permissão espalhada por componentes.
 */
export const ROUTE_ACCESS_MAP: Record<string, RouteAccess> = {
    // Acessível por qualquer autenticado
    '/':              {},
    '/clientes':      {},
    '/pedidos':       {},
    '/agenda':        {},
    '/empresas':      {},
    '/produtos':      {},
    '/catalogos':     {},
    '/configuracoes': {},

    // Requer role de gestor ou superior
    '/usuarios': {
        roles:   ['ADMIN'],
    },

    // Dashboard com dados financeiros requer permissão granular
    // (ADMIN já tem por padrão; GERENTE/VENDEDOR dependem do toggle do ADMIN)
    // Esta permissão é verificada no componente de dashboard, não na rota,
    // pois a rota é acessível mas o conteúdo se adapta.
} as const;