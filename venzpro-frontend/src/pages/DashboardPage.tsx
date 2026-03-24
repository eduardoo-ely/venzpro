import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders } from '@/hooks/useOrders';
import { useEvents } from '@/hooks/useEvents';
import { useCustomers } from '@/hooks/useCustomers';
import { PageHeader } from '@/components/PageHeader';
import { SellerDashboardView } from './dashboards/SellerDashboardView';
import { ManagerDashboardView } from './dashboards/ManagerDashboardView';

export default function DashboardPage() {
  const { user } = useAuth();
  const { orders = [] } = useOrders();
  const { events = [] } = useEvents();
  const { customers = [] } = useCustomers();

  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'GERENTE';

  return (
      <div className="space-y-6">
        <PageHeader
            title={`Olá, ${user?.nome?.split(' ')[0] ?? ''} 👋`}
            subtitle={isManagerOrAdmin ? "Gestão estratégica da equipe." : "Seu progresso pessoal este mês."}
        />

        {isManagerOrAdmin ? (
            <ManagerDashboardView orders={orders} customers={customers} />
        ) : (
            <SellerDashboardView orders={orders} events={events} />
        )}
      </div>
  );
}