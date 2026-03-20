import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomers } from '@/hooks/useCustomers';
import { useOrders } from '@/hooks/useOrders';
import { useEvents } from '@/hooks/useEvents';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Package, FileText, CheckCircle, TrendingUp, Calendar, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { SparkLine } from '@/components/SparkLine';
import { AvatarInitials } from '@/components/AvatarInitials';
import { PageHeader } from '@/components/PageHeader';
import { OnboardingBanner } from '@/components/OnboardingBanner';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const STATUS_CLASSES: Record<string, string> = {
  ORCAMENTO: 'status-orcamento',
  FECHADO:   'status-fechado',
  CANCELADO: 'status-cancelado',
};
const STATUS_LABELS: Record<string, string> = {
  ORCAMENTO: 'Orçamento',
  FECHADO:   'Fechado',
  CANCELADO: 'Cancelado',
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item      = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function DashboardPage() {
  const { user } = useAuth();
  const { customers, isLoading: lC } = useCustomers();
  const { orders,    isLoading: lO } = useOrders();
  const { events,    isLoading: lE } = useEvents();

  const isLoading = lC || lO || lE;

  const monthlyData = useMemo(() => {
    const now    = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return { month: d.getMonth(), year: d.getFullYear(), name: MONTH_NAMES[d.getMonth()], pedidos: 0 };
    });
    orders.forEach(o => {
      if (!o.createdAt) return;
      const d = new Date(o.createdAt);
      const slot = months.find(m => m.month === d.getMonth() && m.year === d.getFullYear());
      if (slot) slot.pedidos++;
    });
    return months;
  }, [orders]);

  const customerSpark = useMemo(() => {
    const days = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - 9 + i); d.setHours(0,0,0,0);
      return d.getTime();
    });
    return days.map(ts => customers.filter(c => c.createdAt && new Date(c.createdAt).setHours(0,0,0,0) <= ts).length);
  }, [customers]);

  const orderSpark = useMemo(() => {
    const days = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - 9 + i); d.setHours(0,0,0,0);
      return d.getTime();
    });
    return days.map(ts => orders.filter(o => o.createdAt && new Date(o.createdAt).setHours(0,0,0,0) <= ts).length);
  }, [orders]);

  const stats = [
    { title: 'Clientes',      value: customers.length,                                         icon: Users,       spark: customerSpark, color: 'hsl(239 84% 67%)' },
    { title: 'Pedidos',       value: orders.length,                                            icon: Package,     spark: orderSpark,    color: 'hsl(258 90% 66%)' },
    { title: 'Em Aberto',     value: orders.filter(o => o.status === 'ORCAMENTO').length,      icon: FileText,    spark: [],            color: 'hsl(38 92% 50%)' },
    { title: 'Fechados',      value: orders.filter(o => o.status === 'FECHADO').length,        icon: CheckCircle, spark: [],            color: 'hsl(160 84% 39%)' },
  ];

  const lastOrders      = [...orders].sort((a,b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()).slice(0, 5);
  const upcomingEvents  = events.filter(e => e.status === 'AGENDADO').slice(0, 4);

  return (
    <div className="space-y-6 max-w-[1400px]">
      <PageHeader
        title={`Olá, ${user?.nome?.split(' ')[0] ?? 'bem-vindo'}! 👋`}
        subtitle="Aqui está o resumo da sua operação comercial"
      />

      {/* Banner de onboarding — só aparece para novos usuários */}
      <OnboardingBanner />

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-glow bg-card"><CardContent className="p-5 space-y-3">
              <div className="flex justify-between"><div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-8 w-16" /></div><Skeleton className="h-10 w-10 rounded-xl" /></div>
              <Skeleton className="h-3 w-32" />
            </CardContent></Card>
          ))}
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div key={i} variants={item}>
              <Card className="border-glow glow-card bg-card">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{s.title}</p>
                      <p className="text-3xl font-bold letter-tight mt-1"><AnimatedCounter value={s.value} /></p>
                    </div>
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color.replace(')', ' / 0.15)')}` }}>
                      <s.icon className="h-5 w-5" style={{ color: s.color }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />Acumulado
                    </span>
                    {s.spark.length > 0 && <SparkLine data={s.spark} color={s.color} />}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Gráfico + Próximos Eventos */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-7">
          <Card className="border-glow bg-card">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold mb-4">Pedidos por Mês</h3>
              {isLoading
                ? <Skeleton className="w-full h-[220px] rounded-lg" />
                : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyData}>
                      <XAxis dataKey="name" tick={{ fill: 'hsl(215 16% 47%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'hsl(215 16% 47%)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: 'hsl(240 22% 12%)', border: '1px solid hsl(240 10% 18%)', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }} />
                      <Bar dataKey="pedidos" radius={[6,6,0,0]} fill="url(#barGrad)" />
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(239 84% 67%)" />
                          <stop offset="100%" stopColor="hsl(258 90% 66%)" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-3">
          <Card className="border-glow bg-card h-full">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Próximos Compromissos
              </h3>
              {isLoading
                ? <div className="space-y-3">{Array.from({ length: 3 }).map((_,i) => <div key={i} className="flex gap-3"><Skeleton className="h-8 w-8 rounded-lg" /><div className="space-y-1 flex-1"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div>)}</div>
                : upcomingEvents.length === 0
                  ? <p className="text-muted-foreground text-xs text-center py-8">Nenhum compromisso agendado</p>
                  : (
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

      {/* Últimos Pedidos */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card className="border-glow bg-card">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Últimos Pedidos</h3>
            {isLoading
              ? <div className="space-y-3">{Array.from({ length: 4 }).map((_,i) => <div key={i} className="flex items-center gap-4"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-3 flex-1" /><Skeleton className="h-3 w-20" /><Skeleton className="h-6 w-16 rounded-full" /></div>)}</div>
              : lastOrders.length === 0
                ? (
                  <div className="text-center py-8">
                    <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhum pedido ainda.</p>
                    <p className="text-xs text-muted-foreground mt-1">Cadastre um cliente e crie seu primeiro pedido.</p>
                  </div>
                )
                : (
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
                              <span className="text-sm font-medium">{order.clienteNome || order.customerId}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{order.empresaNome || order.companyId}</TableCell>
                          <TableCell className="text-sm font-medium">R$ {Number(order.valorTotal).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`${STATUS_CLASSES[order.status]} text-[10px] font-semibold`}>
                              {STATUS_LABELS[order.status]}
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
    </div>
  );
}
