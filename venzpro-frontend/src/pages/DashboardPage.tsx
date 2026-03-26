import { useAuth } from '@/contexts/AuthContext';
import { SellerDashboardView } from './dashboards/SellerDashboardView';
import { ManagerDashboardView } from './dashboards/ManagerDashboardView';
// Importa também o Admin se já o tiveres: import { AdminDashboardView } from './dashboards/AdminDashboardView';

export default function DashboardPage() {
    const { user } = useAuth();

    // Fallback de segurança: se não houver utilizador, não renderiza nada (o AppLayout chuta para o login)
    if (!user) return null;

    // Renderiza a view consoante a ROLE do utilizador logado
    switch (user.role) {
        case 'VENDEDOR':
            return <SellerDashboardView />;
        case 'GERENTE':
            return <ManagerDashboardView />;
        case 'ADMIN':
            // Se tiveres um painel de Admin, colocas aqui. Senão, pode ver o de gerente por enquanto.
            return <ManagerDashboardView />;
        default:
            return (
                <div className="p-8 text-center text-muted-foreground">
                    Perfil de utilizador não reconhecido. Contacte o suporte.
                </div>
            );
    }
}