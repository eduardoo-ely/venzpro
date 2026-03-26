/**
 * App.tsx — Roteamento central do VenzPro.
 *
 * Arquitetura:
 *
 * QueryClientProvider          → cache global de server state
 * └─ AuthProvider              → contexto de autenticação JWT
 * └─ TooltipProvider
 * └─ BrowserRouter
 * └─ Suspense         → fallback global de lazy loading
 * └─ Routes
 * ├─ /login       → público
 * ├─ /register    → público
 * └─ AppLayout    → privado (qualquer autenticado)
 * ├─ /         → qualquer autenticado
 * ├─ /clientes
 * ├─ /pedidos
 * ├─ /agenda
 * ├─ /empresas
 * ├─ /produtos
 * ├─ /catalogos
 * ├─ /configuracoes
 * └─ /usuarios → ADMIN apenas
 *
 * Code Splitting:
 * Cada página é um chunk independente (lazy + Suspense).
 * O bundle inicial contém apenas: AuthContext, AppLayout, login e registro.
 * Todas as outras páginas são baixadas sob demanda.
 *
 * RBAC:
 * ProtectedRoute envolve rotas que exigem role ou permissão específica.
 * AppLayout já garante que qualquer rota filha exige autenticação.
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageLoader } from '@/components/PageLoader';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { queryClient } from '@/lib/queryClient';

// ── Páginas públicas (carregadas no bundle inicial — são leves e críticas) ────
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import NotFound from '@/pages/NotFound';

// ── Páginas privadas — lazy (carregadas sob demanda por rota) ─────────────────
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const ClientesPage = lazy(() => import('@/pages/ClientesPage'));
const PedidosPage = lazy(() => import('@/pages/PedidosPage'));
const AgendaPage = lazy(() => import('@/pages/AgendaPage'));
const EmpresasPage = lazy(() => import('@/pages/EmpresasPage'));
const ProdutosPage = lazy(() => import('@/pages/ProdutosPage'));
const CatalogosPage = lazy(() => import('@/pages/CatalogosPage'));
const ConfiguracoesPage = lazy(() => import('@/pages/ConfiguracoesPage'));
const UsuariosPage = lazy(() => import('@/pages/UsuariosPage'));

// ── Wrapper de rota lazy ──────────────────────────────────────────────────────
function LazyRoute({ children }: { children: React.ReactNode }) {
  return (
      <RouteErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </RouteErrorBoundary>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
const App = () => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster position="bottom-right" richColors closeButton />
          <BrowserRouter>
            <Routes>

              {/* ── Rotas públicas ─────────────────────────────────────────── */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* ── Rotas privadas ─────────────────────────────────────────── */}
              <Route element={<AppLayout />}>

                {/* Acesso livre para qualquer autenticado */}
                <Route path="/" element={<LazyRoute><DashboardPage /></LazyRoute>} />
                <Route path="/clientes" element={<LazyRoute><ClientesPage /></LazyRoute>} />
                <Route path="/pedidos" element={<LazyRoute><PedidosPage /></LazyRoute>} />
                <Route path="/agenda" element={<LazyRoute><AgendaPage /></LazyRoute>} />
                <Route path="/empresas" element={<LazyRoute><EmpresasPage /></LazyRoute>} />
                <Route path="/produtos" element={<LazyRoute><ProdutosPage /></LazyRoute>} />
                <Route path="/catalogos" element={<LazyRoute><CatalogosPage /></LazyRoute>} />
                <Route path="/configuracoes" element={<LazyRoute><ConfiguracoesPage /></LazyRoute>} />

                {/* Acesso restrito apenas para ADMIN */}
                <Route
                    path="/usuarios"
                    element={
                      <ProtectedRoute roles={['ADMIN']} onDeny="unauthorized">
                        <LazyRoute>
                          <UsuariosPage />
                        </LazyRoute>
                      </ProtectedRoute>
                    }
                />

              </Route>

              {/* ── 404 ──────────────────────────────────────────────────────── */}
              <Route path="*" element={<NotFound />} />

            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
);

export default App;