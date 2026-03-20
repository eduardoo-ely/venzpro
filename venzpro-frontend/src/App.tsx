import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { queryClient } from '@/lib/queryClient';

import LoginPage        from '@/pages/LoginPage';
import RegisterPage     from '@/pages/RegisterPage';
import DashboardPage    from '@/pages/DashboardPage';
import ClientesPage     from '@/pages/ClientesPage';
import PedidosPage      from '@/pages/PedidosPage';
import AgendaPage       from '@/pages/AgendaPage';
import EmpresasPage     from '@/pages/EmpresasPage';
import CatalogosPage    from '@/pages/CatalogosPage';
import ConfiguracoesPage from '@/pages/ConfiguracoesPage';
import NotFound         from '@/pages/NotFound';

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        {/* Toaster do Sonner — exibe todos os toasts do notify helper */}
        <Toaster position="bottom-right" richColors closeButton />
        <BrowserRouter>
          <Routes>
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<AppLayout />}>
              <Route path="/"              element={<DashboardPage />} />
              <Route path="/clientes"      element={<ClientesPage />} />
              <Route path="/pedidos"       element={<PedidosPage />} />
              <Route path="/agenda"        element={<AgendaPage />} />
              <Route path="/empresas"      element={<EmpresasPage />} />
              <Route path="/catalogos"     element={<CatalogosPage />} />
              <Route path="/configuracoes" element={<ConfiguracoesPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
