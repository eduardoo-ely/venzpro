import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, Package, FileText, CheckCircle, TrendingUp, Calendar, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getCustomersByOrg, getOrdersByOrg, getEventsByOrg } from '@/api/api';
import { motion } from 'framer-motion';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { SparkLine } from '@/components/SparkLine';
import { AvatarInitials } from '@/components/AvatarInitials';
import { PageHeader } from '@/components/PageHeader';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

const sparkData1 = [4, 7, 5, 8, 12, 9, 14, 18, 15, 22];
const sparkData2 = [10, 12, 8, 15, 18, 22, 19, 25, 30, 28];
const sparkData3 = [2, 4, 3, 6, 5, 8, 7, 10, 9, 6];
const sparkData4 = [5, 8, 12, 10, 15, 18, 22, 20, 25, 30];

const monthlyData = [
  { name: 'Jan', pedidos: 12 }, { name: 'Fev', pedidos: 19 },
  { name: 'Mar', pedidos: 15 }, { name: 'Abr', pedidos: 25 },
  { name: 'Mai', pedidos: 32 }, { name: 'Jun', pedidos: 28 },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function DashboardPage() {
  const { organization } = useAuth();
  const orgId = organization?.id || '';

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', orgId], queryFn: () => getCustomersByOrg(orgId), enabled: !!orgId,
  });
  const { data: orders = [] } = useQuery({
    queryKey: ['orders', orgId], queryFn: () => getOrdersByOrg(orgId), enabled: !!orgId,
  });
  const { data: events = [] } = useQuery({
    queryKey: ['events', orgId], queryFn: () => getEventsByOrg(orgId), enabled: !!orgId,
  });

  const stats = [
    { title: 'Total de Clientes', value: customers.length, icon: Users, change: '+12%', spark: sparkData1, color: 'hsl(239 84% 67%)' },
    { title: 'Total de Pedidos', value: orders.length, icon: Package, change: '+8%', spark: sparkData2, color: 'hsl(258 90% 66%)' },
    { title: 'Em Aberto', value: orders.filter(o => o.status === 'ORCAMENTO').length, icon: FileText, change: '-3%', spark: sparkData3, color: 'hsl(38 92% 50%)' },
    { title: 'Fechados', value: orders.filter(o => o.status === 'FECHADO').length, icon: CheckCircle, change: '+24%', spark: sparkData4, color: 'hsl(160 84% 39%)' },
  ];

  const lastOrders = orders.slice(-5).reverse();
  const upcomingEvents = events.filter(e => e.status === 'AGENDADO').slice(0, 4);

  const statusClass = (s: string) => {
    if (s === 'ORCAMENTO') return 'status-orcamento';
    if (s === 'FECHADO') return 'status-fechado';
    return 'status-cancelado';
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      <PageHeader title="Dashboard" subtitle="Visão geral da sua operação comercial" />

      {/* KPI Cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={i} variants={item}>
            <Card className="border-glow glow-card bg-card">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{s.title}</p>
                    <p className="text-3xl font-bold letter-tight mt-1">
                      <AnimatedCounter value={s.value} />
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color.replace(')', ' / 0.15)')}` }}>
                    <s.icon className="h-5 w-5" style={{ color: s.color.replace('hsl(', 'hsl(').replace(')', ')') }} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium flex items-center gap-1 ${s.change.startsWith('+') ? 'text-status-success' : 'text-status-danger'}`}>
                    <TrendingUp className="h-3 w-3" />
                    {s.change} vs mês anterior
                  </span>
                  <SparkLine data={s.spark} color={s.color} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts + Calendar row */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-7">
          <Card className="border-glow bg-card">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold mb-4">Pedidos por Mês</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData}>
                  <XAxis dataKey="name" tick={{ fill: 'hsl(215 16% 47%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'hsl(215 16% 47%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(240 22% 12%)', border: '1px solid hsl(240 10% 18%)', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }}
                  />
                  <Bar dataKey="pedidos" radius={[6, 6, 0, 0]} fill="url(#barGradient)" />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(239 84% 67%)" />
                      <stop offset="100%" stopColor="hsl(258 90% 66%)" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-3">
          <Card className="border-glow bg-card h-full">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Próximos Eventos
              </h3>
              {upcomingEvents.length === 0 ? (
                <p className="text-muted-foreground text-xs text-center py-8">Nenhum evento agendado</p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map(ev => (
                    <div key={ev.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{ev.titulo}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(ev.dataInicio).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent orders + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="lg:col-span-7">
          <Card className="border-glow bg-card">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold mb-4">Últimos Pedidos</h3>
              {lastOrders.length === 0 ? (
                <p className="text-muted-foreground text-xs text-center py-8">Nenhum pedido cadastrado ainda.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30 hover:bg-transparent">
                      <TableHead className="text-muted-foreground text-xs">Cliente</TableHead>
                      <TableHead className="text-muted-foreground text-xs">Empresa</TableHead>
                      <TableHead className="text-muted-foreground text-xs">Valor</TableHead>
                      <TableHead className="text-muted-foreground text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lastOrders.map(order => (
                      <TableRow key={order.id} className="border-border/20 hover:bg-muted/20 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <AvatarInitials name={order.clienteNome || 'C'} size="sm" />
                            <span className="text-sm font-medium">{order.clienteNome || order.clienteId}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{order.empresaNome || order.empresaId}</TableCell>
                        <TableCell className="text-sm font-medium">R$ {order.valorTotal.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${statusClass(order.status)} text-[10px] font-semibold`}>
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
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="lg:col-span-3">
          <Card className="border-glow bg-card h-full">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold mb-4">Atividade Recente</h3>
              <div className="space-y-4">
                {[
                  { text: 'Novo pedido criado', time: 'Há 2 min', color: 'bg-primary' },
                  { text: 'Cliente adicionado', time: 'Há 15 min', color: 'bg-status-success' },
                  { text: 'Pedido fechado', time: 'Há 1h', color: 'bg-status-success' },
                  { text: 'Evento agendado', time: 'Há 2h', color: 'bg-status-info' },
                  { text: 'Orçamento cancelado', time: 'Há 3h', color: 'bg-status-danger' },
                ].map((a, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="relative flex flex-col items-center">
                      <div className={`h-2 w-2 rounded-full ${a.color} mt-1.5`} />
                      {i < 4 && <div className="w-px h-full bg-border/30 absolute top-3" />}
                    </div>
                    <div>
                      <p className="text-xs font-medium">{a.text}</p>
                      <p className="text-[10px] text-muted-foreground">{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
