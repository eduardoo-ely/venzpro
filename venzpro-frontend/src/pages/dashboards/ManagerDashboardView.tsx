import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { DollarSign, ShoppingBag, AlertCircle, Users, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers } from '@/hooks/useUsers';
import type { Order, Customer } from '@/types';

// ── Props ─────────────────────────────────────────────────────────────────────
interface ManagerDashboardViewProps {
    orders: Order[];
    customers: Customer[];
    isLoadingOrders: boolean;
    isLoadingCustomers: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

function parseDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
}

function isSameMonthYear(date: Date, ref: Date): boolean {
    return (
        date.getMonth() === ref.getMonth() &&
        date.getFullYear() === ref.getFullYear()
    );
}

// Cores para o gráfico de rosca (Status)
const STATUS_COLORS = {
    ORCAMENTO: '#f59e0b', // Laranja
    ENVIADO: '#3b82f6',   // Azul
    APROVADO: '#10b981',  // Verde
    CONCLUIDO: '#059669', // Verde Escuro
    REJEITADO: '#ef4444', // Vermelho
    CANCELADO: '#6b7280', // Cinza
};

// ── Componente ────────────────────────────────────────────────────────────────
export function ManagerDashboardView({
                                         orders,
                                         customers,
                                         isLoadingOrders,
                                         isLoadingCustomers,
                                     }: ManagerDashboardViewProps) {
    const { user } = useAuth();
    const { users, isLoading: loadingUsers } = useUsers();

    const isLoading = isLoadingOrders || isLoadingCustomers || loadingUsers;

    // ── Processamento de Dados (Memoizado) ────────────────────────────────────────
    const { stats, revenueData, statusData } = useMemo(() => {
        const now = new Date();
        let faturamentoMes = 0;
        let pedidosPendentesCount = 0;

        const vendedoresMap: Record<string, { nome: string; vendas: number; pedidos: number }> = {};
        const groupedRevenue: Record<string, number> = {};
        const groupedStatus: Record<string, number> = {};

        for (const order of orders) {
            const orderDate = parseDate(order.createdAt);
            if (!orderDate) continue;

            // Agrupa status
            groupedStatus[order.status] = (groupedStatus[order.status] || 0) + 1;

            // Agrupa faturamento diário (apenas concluídos/aprovados do mês)
            if ((order.status === 'CONCLUIDO' || order.status === 'APROVADO') && isSameMonthYear(orderDate, now)) {
                const dateStr = orderDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                groupedRevenue[dateStr] = (groupedRevenue[dateStr] || 0) + Number(order.valorTotal || 0);
            }

            if (isSameMonthYear(orderDate, now)) {
                if (order.status === 'CONCLUIDO') {
                    faturamentoMes += Number(order.valorTotal || 0);

                    // Ranking
                    const vId = order.user?.id || 'unknown';
                    if (!vendedoresMap[vId]) {
                        vendedoresMap[vId] = {
                            nome: order.user?.nome || 'Desconhecido',
                            vendas: 0,
                            pedidos: 0,
                        };
                    }
                    vendedoresMap[vId].vendas += Number(order.valorTotal || 0);
                    vendedoresMap[vId].pedidos += 1;
                } else if (['ORCAMENTO', 'ENVIADO', 'APROVADO'].includes(order.status)) {
                    pedidosPendentesCount++;
                }
            }
        }

        // Formata dados para os gráficos Recharts
        const chartRevenue = Object.entries(groupedRevenue).map(([date, total]) => ({ date, total }));
        const chartStatus = Object.entries(groupedStatus).map(([name, value]) => ({ name, value }));

        const safeCustomers = Array.isArray(customers) ? customers : (customers as any)?.content || [];
        const clientesAguardando = safeCustomers.filter((c: any) => c.status === 'PENDENTE').length;

        const safeUsers = Array.isArray(users) ? users : (users as any)?.content || [];
        const vendedoresAtivos = safeUsers.filter((u: any) => u.role === 'VENDEDOR').length;

        const topVendedores = Object.values(vendedoresMap)
            .sort((a, b) => b.vendas - a.vendas)
            .slice(0, 5);

        return {
            stats: { faturamentoMes, pedidosPendentesCount, clientesAguardando, vendedoresAtivos, topVendedores },
            revenueData: chartRevenue,
            statusData: chartStatus,
        };
    }, [orders, customers, users]);

    // ── Render ─────────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="flex h-[60vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard title="Faturamento da equipe" value={formatCurrency(stats.faturamentoMes)} sub="Pedidos concluídos no mês atual" icon={DollarSign} iconClass="text-emerald-500" />
                <KpiCard title="Pedidos em andamento" value={String(stats.pedidosPendentesCount)} sub="Orçamento, enviado ou aprovado" icon={ShoppingBag} iconClass="text-primary" />
                <KpiCard title="Clientes aguardando" value={String(stats.clientesAguardando)} sub="Novos registros a aprovar (RN §6)" icon={AlertCircle} iconClass="text-[hsl(38,92%,50%)]" />
                <KpiCard title="Vendedores na equipe" value={String(stats.vendedoresAtivos)} sub="Ativos com role VENDEDOR" icon={Users} iconClass="text-violet-500" />
            </div>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">

                {/* Gráfico Recharts - Faturamento */}
                <Card className="lg:col-span-4 border-glow bg-card">
                    <CardHeader>
                        <CardTitle className="text-base">Evolução de Faturamento</CardTitle>
                        <CardDescription>Pedidos aprovados/concluídos neste mês</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[280px]">
                        {revenueData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${val}`} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} formatter={(val: number) => formatCurrency(val)} />
                                    <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">Nenhum faturamento registrado ainda.</div>
                        )}
                    </CardContent>
                </Card>

                {/* Gráfico Recharts - Rosca Status */}
                <Card className="lg:col-span-3 border-glow bg-card">
                    <CardHeader>
                        <CardTitle className="text-base">Status Geral dos Pedidos</CardTitle>
                        <CardDescription>Distribuição de todo o histórico</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[280px]">
                        {statusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || '#8884d8'} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '8px' }} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">Sem pedidos para analisar.</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Ranking de vendedores original (MANTIDO) */}
            <Card className="border-glow bg-card w-full">
                <CardHeader>
                    <CardTitle className="text-base">Top vendedores</CardTitle>
                    <CardDescription>Pedidos concluídos no mês atual</CardDescription>
                </CardHeader>
                <CardContent>
                    {stats.topVendedores.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma venda concluída este mês.</p>
                    ) : (
                        <div className="space-y-4 max-w-2xl">
                            {stats.topVendedores.map((v, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground w-4 tabular-nums text-right shrink-0">{i + 1}.</span>
                                    <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                                        {v.nome.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate" title={v.nome}>{v.nome}</p>
                                        <p className="text-xs text-muted-foreground">{v.pedidos} {v.pedidos === 1 ? 'pedido' : 'pedidos'}</p>
                                    </div>
                                    <span className="text-sm font-bold tabular-nums shrink-0">{formatCurrency(v.vendas)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// ── Sub-componente: card de KPI ───────────────────────────────────────────────
interface KpiCardProps {
    title: string;
    value: string;
    sub: string;
    icon: React.ElementType;
    iconClass: string;
}

function KpiCard({ title, value, sub, icon: Icon, iconClass }: KpiCardProps) {
    return (
        <Card className="border-glow bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold tabular-nums">{value}</div>
                <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </CardContent>
        </Card>
    );
}