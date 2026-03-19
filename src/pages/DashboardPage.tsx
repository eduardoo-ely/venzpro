import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, Package, FileText, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getCustomersByOrg, getOrdersByOrg } from '@/api/api';

const statCards = [
  { title: 'Total de Clientes', icon: Users, key: 'clientes' as const, color: 'text-primary' },
  { title: 'Total de Pedidos', icon: Package, key: 'pedidos' as const, color: 'text-primary' },
  { title: 'Pedidos em Aberto', icon: FileText, key: 'abertos' as const, color: 'text-status-warning' },
  { title: 'Pedidos Fechados', icon: CheckCircle, key: 'fechados' as const, color: 'text-status-success' },
];

export default function DashboardPage() {
  const { organization } = useAuth();
  const orgId = organization?.id || '';

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', orgId],
    queryFn: () => getCustomersByOrg(orgId),
    enabled: !!orgId,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders', orgId],
    queryFn: () => getOrdersByOrg(orgId),
    enabled: !!orgId,
  });

  const stats = {
    clientes: customers.length,
    pedidos: orders.length,
    abertos: orders.filter(o => o.status === 'ORCAMENTO').length,
    fechados: orders.filter(o => o.status === 'FECHADO').length,
  };

  const lastOrders = orders.slice(-5).reverse();

  const statusClass = (s: string) => {
    if (s === 'ORCAMENTO') return 'status-orcamento';
    if (s === 'FECHADO') return 'status-fechado';
    return 'status-cancelado';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da sua operação comercial</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <Card key={card.key} className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats[card.key]}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Últimos Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          {lastOrders.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Nenhum pedido cadastrado ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lastOrders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.clienteNome || order.clienteId}</TableCell>
                    <TableCell>{order.empresaNome || order.empresaId}</TableCell>
                    <TableCell>R$ {order.valorTotal.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusClass(order.status)}>
                        {order.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
