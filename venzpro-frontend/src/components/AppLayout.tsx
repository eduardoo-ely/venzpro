import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth }             from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar }          from '@/components/AppSidebar';
import { SupportButton }       from '@/components/SupportButton';
import { OnboardingBanner }    from '@/components/OnboardingBanner';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * AppLayout — shell de autenticação e layout compartilhado.
 *
 * Responsabilidades:
 *   1. Redirecionar para /login se não autenticado (única verificação aqui)
 *   2. Renderizar sidebar, header e OnboardingBanner
 *   3. Animar transições entre páginas
 *
 * NÃO faz: verificação de role ou permissão.
 * Isso é responsabilidade do ProtectedRoute em cada rota que precisar.
 */
export function AppLayout() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // ── Guarda de autenticação ────────────────────────────────────────────────
  // Preserva a rota de destino no state para redirecionar após o login.
  if (!isAuthenticated) {
    return (
        <Navigate
            to="/login"
            state={{ from: location }}
            replace
        />
    );
  }

  return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />

          <div className="flex-1 flex flex-col min-w-0">
            {/* Header fixo */}
            <header className="h-12 flex items-center border-b border-border/50 bg-background/80 glass px-4 shrink-0 sticky top-0 z-30">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            </header>

            {/* Conteúdo principal */}
            <main className="flex-1 p-6 overflow-auto">
              {/* Banner de onboarding — global, uma única instância */}
              {!user?.onboardingCompleted && <OnboardingBanner />}

              {/* Transição suave entre páginas */}
              <AnimatePresence mode="wait">
                <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>

        {/* Botão de suporte flutuante */}
        <SupportButton />
      </SidebarProvider>
  );
}