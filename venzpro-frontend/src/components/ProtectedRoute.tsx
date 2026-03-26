import { Navigate, useLocation } from 'react-router-dom';
import { useAuth }               from '@/contexts/AuthContext';
import type { RouteAccess }      from '@/types/auth';
import { hasAnyRole, hasMinRole } from '@/types/auth';
import type { UserRole, Permission } from '@/types/auth';

// ── Tela de acesso negado ─────────────────────────────────────────────────────

function UnauthorizedScreen() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-destructive"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                    />
                </svg>
            </div>

            <h2 className="text-xl font-bold letter-tight mb-2">Acesso não autorizado</h2>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
                Você não tem permissão para visualizar este conteúdo.
                Fale com o administrador da sua organização se precisar de acesso.
            </p>

            <a
                href="/"
                className="text-sm text-primary font-medium hover:underline underline-offset-4"
            >
                Voltar ao início
            </a>
        </div>
    );
}

// ── Props do ProtectedRoute ───────────────────────────────────────────────────

interface ProtectedRouteProps extends RouteAccess {
    /** Conteúdo protegido */
    children: React.ReactNode;
    /**
     * Comportamento ao negar acesso:
     * - 'unauthorized' → mostra tela de acesso negado (padrão)
     * - 'redirect'     → redireciona para '/' silenciosamente
     */
    onDeny?: 'unauthorized' | 'redirect';
}

// ── ProtectedRoute ────────────────────────────────────────────────────────────

/**
 * ProtectedRoute — guarda de rota com RBAC completo.
 *
 * Camadas de verificação (todas devem passar):
 *   1. Autenticação    — usuário tem token JWT válido?
 *   2. Role            — role do usuário está na lista permitida?
 *   3. Role mínimo     — role do usuário >= mínimo exigido?
 *   4. Permissões      — usuário tem TODAS as permissões granulares exigidas?
 *
 * Uso:
 *   <ProtectedRoute roles={['ADMIN']}>
 *     <UsuariosPage />
 *   </ProtectedRoute>
 *
 *   <ProtectedRoute permissions={['podeVerDashboard']}>
 *     <DashboardFinanceiroPage />
 *   </ProtectedRoute>
 *
 *   <ProtectedRoute minRole="GERENTE" onDeny="redirect">
 *     <RelatoriosPage />
 *   </ProtectedRoute>
 */
export function ProtectedRoute({
                                   children,
                                   roles,
                                   minRole,
                                   permissions,
                                   onDeny = 'unauthorized',
                               }: ProtectedRouteProps) {
    const { isAuthenticated, user } = useAuth();
    const location = useLocation();

    // ── Camada 1: Autenticação ────────────────────────────────────────────────
    if (!isAuthenticated || !user) {
        return (
            <Navigate
                to="/login"
                state={{ from: location }}
                replace
            />
        );
    }

    const userRole = user.role as UserRole;

    // ── Camada 2: Verificação de role ─────────────────────────────────────────
    if (roles && roles.length > 0) {
        if (!hasAnyRole(userRole, roles)) {
            return onDeny === 'redirect'
                ? <Navigate to="/" replace />
                : <UnauthorizedScreen />;
        }
    }

    // ── Camada 3: Role mínimo ────────────────────────────────────────────────
    if (minRole) {
        if (!hasMinRole(userRole, minRole)) {
            return onDeny === 'redirect'
                ? <Navigate to="/" replace />
                : <UnauthorizedScreen />;
        }
    }

    // ── Camada 4: Permissões granulares ───────────────────────────────────────
    if (permissions && permissions.length > 0) {
        const temTodasPermissoes = permissions.every(
            (p) => user[p as keyof typeof user] === true
        );
        if (!temTodasPermissoes) {
            return onDeny === 'redirect'
                ? <Navigate to="/" replace />
                : <UnauthorizedScreen />;
        }
    }

    // Todas as camadas passaram — renderiza o conteúdo
    return <>{children}</>;
}