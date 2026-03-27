import { useAuth }      from '@/contexts/AuthContext';
import { useOrders }    from '@/hooks/useOrders';
import { useEvents }    from '@/hooks/useEvents';
import { useCustomers } from '@/hooks/useCustomers';
import { PageHeader }   from '@/components/PageHeader';
import { SellerDashboardView }  from './dashboards/SellerDashboardView';
import { ManagerDashboardView } from './dashboards/ManagerDashboardView';

/**
 * DashboardPage — orquestrador de dados, não tem lógica de negócio.
 *
 * Responsabilidades:
 *   1. Determinar qual view renderizar (ADMIN/GERENTE vs VENDEDOR)
 *   2. Buscar os dados necessários para a view ativa
 *   3. Passar dados e estados de loading como props — as views não buscam dados sozinhas
 *
 * Por que buscar aqui e não nas views?
 *   - Evita queries duplicadas se ambas as views existissem na mesma página
 *   - Centraliza o controle de loading/error
 *   - Facilita testes unitários das views (basta mockar as props)
 *   - As views ficam puramente de apresentação
 *
 * Exceção: ManagerDashboardView busca `users` internamente pois `users`
 * é exclusivo da visão de gestor e não faz sentido buscar para o VENDEDOR.
 */
export default function DashboardPage() {
    const { user } = useAuth();

    const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'GERENTE';

    // Dados compartilhados por ambas as views
    const { orders, isLoading: isLoadingOrders }         = useOrders();
    const { customers, isLoading: isLoadingCustomers }   = useCustomers();

    // Eventos — apenas para a visão do vendedor
    // Não buscamos para ADMIN/GERENTE para evitar query desnecessária
    const { events, isLoading: isLoadingEvents } = useEvents();

    return (
        <div className="space-y-6">
            <PageHeader
                title={`Olá, ${user?.nome?.split(' ')[0] ?? ''} 👋`}
                subtitle={
                    isManagerOrAdmin
                        ? 'Resumo da equipe e métricas do mês atual.'
                        : 'Seu progresso e agenda do dia.'
                }
            />

            {isManagerOrAdmin ? (
                <ManagerDashboardView
                    orders={orders}
                    customers={customers}
                    isLoadingOrders={isLoadingOrders}
                    isLoadingCustomers={isLoadingCustomers}
                />
            ) : (
                <SellerDashboardView
                    orders={orders}
                    events={events}
                />
            )}
        </div>
    );
}