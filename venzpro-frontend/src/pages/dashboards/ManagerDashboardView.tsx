import { useMemo } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Users, DollarSign, ShoppingBag, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth }      from '@/contexts/AuthContext';
import { useUsers }     from '@/hooks/useUsers';
import type { Order, Customer } from '@/types';

// ── Props ─────────────────────────────────────────────────────────────────────

interface ManagerDashboardViewProps {
    orders:           Order[];
    customers:        Customer[];
    isLoadingOrders:  boolean;
    isLoadingCustomers: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

/**
 * Converte string ISO para Date de forma segura.
 * Retorna null se o valor for undefined, null ou inválido.
 */
function parseDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
}

function isSameMonthYear(date: Date, ref: Date): boolean {
    return (
        date.getMonth()     === ref.getMonth() &&
        date.getFullYear()  === ref.getFullYear()
    );
}

// ── Componente ────────────────────────────────────────────────────────────────

export function ManagerDashboardView({
                                         orders,
                                         customers,
                                         isLoadingOrders,
                                         isLoadingCustomers,
                                     }: ManagerDashboardViewProps) {
    const { user }                         = useAuth();
    const { users, isLoading: loadingUsers } = useUsers();

    // Único carregamento global — aguarda os três datasets
    const isLoading = isLoadingOrders || isLoadingCustomers || loadingUsers;

    // ── Cálculo de métricas (memoizado) ────────────────────────────────────────
    const stats = useMemo(() => {
        const now = new Date();

        let faturamentoMes          = 0;
        let pedidosPendentesCount   = 0;

        // Mapa para ranking: chave = userId, valor = agregação
        const vendedoresMap: Record<string, {
            nome:   string;
            vendas: number;
            pedidos: number;
        }> = {};

        for (const order of orders) {
            // Segurança: ignora pedidos com data inválida
            const orderDate = parseDate(order.createdAt);
            if (!orderDate || !isSameMonthYear(orderDate, now)) continue;

            if (order.status === 'CONCLUIDO') {
                faturamentoMes += order.valorTotal ?? 0;

                // Agrega por vendedor — userId é a chave (garante unicidade mesmo com nomes iguais)
                const vId = order.userId;
                if (vId) {
                    if (!vendedoresMap[vId]) {
                        vendedoresMap[vId] = {
                            nome:    order.vendedorNome ?? 'Vendedor desconhecido',
                            vendas:  0,
                            pedidos: 0,
                        };
                    }
                    vendedoresMap[vId].vendas  += order.valorTotal ?? 0;
                    vendedoresMap[vId].pedidos += 1;
                }
            } else if (['ORCAMENTO', 'ENVIADO', 'APROVADO'].includes(order.status)) {
                pedidosPendentesCount++;
            }
        }

        // Clientes aguardando aprovação (RN §6 — status PENDENTE)
        const clientesAguardando = customers.filter(c => c.status === 'PENDENTE').length;

        // Vendedores ativos na equipe
        const vendedoresAtivos = users.filter(u => u.role === 'VENDEDOR').length;

        // Top 5 por volume de vendas no mês
        const topVendedores = Object.values(vendedoresMap)
            .sort((a, b) => b.vendas - a.vendas)
            .slice(0, 5);

        return {
            faturamentoMes,
            pedidosPendentesCount,
            clientesAguardando,
            vendedoresAtivos,
            topVendedores,
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
                <KpiCard
                    title="Faturamento da equipe"
                    value={formatCurrency(stats.faturamentoMes)}
                    sub="Pedidos concluídos no mês atual"
                    icon={DollarSign}
                    iconClass="text-emerald-500"
                />
                <KpiCard
                    title="Pedidos em andamento"
                    value={String(stats.pedidosPendentesCount)}
                    sub="Orçamento, enviado ou aprovado"
                    icon={ShoppingBag}
                    iconClass="text-primary"
                />
                <KpiCard
                    title="Clientes aguardando"
                    value={String(stats.clientesAguardando)}
                    sub="Novos registros a aprovar (RN §6)"
                    icon={AlertCircle}
                    iconClass="text-[hsl(38,92%,50%)]"
                />
                <KpiCard
                    title="Vendedores na equipe"
                    value={String(stats.vendedoresAtivos)}
                    sub="Ativos com role VENDEDOR"
                    icon={Users}
                    iconClass="text-violet-500"
                />
            </div>

            {/* Linha inferior: placeholder de gráfico + ranking */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">

                {/* Gráfico — placeholder para integração futura com Recharts */}
                <Card className="lg:col-span-4 border-glow bg-card">
                    <CardHeader>
                        <CardTitle className="text-base">Performance de vendas</CardTitle>
                        <CardDescription>Evolução diária da equipe — mês atual</CardDescription>
                    </CardHeader>
                    <CardContent className="flex h-[260px] items-center justify-center border-t border-border/30">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                            <TrendingUp className="h-10 w-10" />
                            <span className="text-xs">Integração com Recharts — sprint futura</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Ranking de vendedores */}
                <Card className="lg:col-span-3 border-glow bg-card">
                    <CardHeader>
                        <CardTitle className="text-base">Top vendedores</CardTitle>
                        <CardDescription>Pedidos concluídos no mês atual</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats.topVendedores.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                Nenhuma venda concluída este mês.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {stats.topVendedores.map((v, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        {/* Posição */}
                                        <span className="text-xs text-muted-foreground w-4 tabular-nums text-right shrink-0">
                      {i + 1}.
                    </span>

                                        {/* Avatar com inicial */}
                                        <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                                            {v.nome.charAt(0).toUpperCase()}
                                        </div>

                                        {/* Nome + contagem */}
                                        <div className="flex-1 min-w-0">
                                            <p
                                                className="text-sm font-medium truncate"
                                                title={v.nome}
                                            >
                                                {v.nome}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {v.pedidos} {v.pedidos === 1 ? 'pedido' : 'pedidos'}
                                            </p>
                                        </div>

                                        {/* Volume */}
                                        <span className="text-sm font-bold tabular-nums shrink-0">
                      {formatCurrency(v.vendas)}
                    </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// ── Sub-componente: card de KPI ───────────────────────────────────────────────

interface KpiCardProps {
    title:     string;
    value:     string;
    sub:       string;
    icon:      React.ElementType;
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