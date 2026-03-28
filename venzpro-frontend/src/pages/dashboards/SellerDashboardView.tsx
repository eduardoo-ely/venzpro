import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { DollarSign, ShoppingCart, Target, Medal, Calendar as CalendarIcon, Activity } from 'lucide-react';
import type { Order, Event as AppEvent, EventType } from '@/types';

// ── Props ─────────────────────────────────────────────────────────────────────
interface SellerDashboardViewProps {
    orders: Order[];
    events: AppEvent[];
}

// ── Constantes de meta e UI ───────────────────────────────────────────────────
const META_MENSAL_OURO = 50_000;
const META_MENSAL_DIAMANTE = 100_000;
const TAXA_BASE = 0.03;
const TAXA_OURO = 0.05;
const TAXA_DIAMANTE = 0.07;

const EVENT_COLORS: Record<string, string> = {
    VISITA: '#6366f1',    // Indigo
    REUNIAO: '#06b6d4',   // Cyan
    FOLLOW_UP: '#f59e0b', // Amber
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

function calcComissao(faturado: number) {
    if (faturado >= META_MENSAL_DIAMANTE)
        return { taxa: TAXA_DIAMANTE, valor: faturado * TAXA_DIAMANTE, nivel: 'Diamante' };
    if (faturado >= META_MENSAL_OURO)
        return { taxa: TAXA_OURO, valor: faturado * TAXA_OURO, nivel: 'Ouro' };
    return { taxa: TAXA_BASE, valor: faturado * TAXA_BASE, nivel: 'Base' };
}

// ── Componente ────────────────────────────────────────────────────────────────
export function SellerDashboardView({ orders, events }: SellerDashboardViewProps) {

    // ── 1. Processamento de Métricas e Metas ──
    const stats = useMemo(() => {
        const faturado = orders
            .filter(o => o.status === 'CONCLUIDO')
            .reduce((acc, o) => acc + (Number(o.valorTotal) || 0), 0);

        const emNegociacao = orders
            .filter(o => ['ORCAMENTO', 'ENVIADO', 'APROVADO'].includes(o.status))
            .reduce((acc, o) => acc + (Number(o.valorTotal) || 0), 0);

        const totalVendas = orders.filter(o => o.status === 'CONCLUIDO').length;
        const comissao = calcComissao(faturado);

        return { faturado, emNegociacao, totalVendas, comissao };
    }, [orders]);

    const progressoOuro = Math.min((stats.faturado / META_MENSAL_OURO) * 100, 100);
    const progressoDiamante = Math.min(Math.max((stats.faturado - META_MENSAL_OURO) / (META_MENSAL_DIAMANTE - META_MENSAL_OURO) * 100, 0), 100);

    // ── 2. Processamento de Eventos (Lista e Gráfico) ──
    const proximosEventos = useMemo(() => {
        if (!events) return [];
        return events
            .filter(e => e.status === 'AGENDADO')
            .sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime())
            .slice(0, 5);
    }, [events]);

    const eventsData = useMemo(() => {
        if (!events) return [];
        const grouped = events.reduce((acc, ev) => {
            acc[ev.tipo] = (acc[ev.tipo] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(grouped).map(([tipo, count]) => ({
            name: tipo.replace('_', ' '),
            quantidade: count,
            color: EVENT_COLORS[tipo] || '#8884d8'
        }));
    }, [events]);

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">

            {/* Linha 1: KPIs Principais */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard title="Meu faturamento" value={formatCurrency(stats.faturado)} sub="Pedidos concluídos" icon={DollarSign} iconClass="text-emerald-500" />
                <KpiCard title={`Comissão ${stats.comissao.nivel} (${(stats.comissao.taxa * 100).toFixed(0)}%)`} value={formatCurrency(stats.comissao.valor)} sub="Baseado no faturado" icon={Medal} iconClass="text-amber-500" />
                <KpiCard title="Em negociação" value={formatCurrency(stats.emNegociacao)} sub="Orçamento + enviado + aprovado" icon={Target} iconClass="text-primary" />
                <KpiCard title="Vendas fechadas" value={String(stats.totalVendas)} sub="Pedidos concluídos" icon={ShoppingCart} iconClass="text-violet-500" />
            </div>

            {/* Linha 2: Metas (Gamificação) e Agenda Próxima */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Metas Mensais */}
                <Card className="lg:col-span-2 border-glow bg-card">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Target className="h-4 w-4 text-destructive" />Minhas metas do mês
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Meta Ouro — 5% de comissão</span>
                                <span className="tabular-nums font-medium">{progressoOuro.toFixed(0)}% de {formatCurrency(META_MENSAL_OURO)}</span>
                            </div>
                            <Progress value={progressoOuro} className="h-2.5" />
                        </div>
                        <div className="space-y-2">
                            <div className={`flex justify-between text-sm ${progressoOuro < 100 ? 'opacity-40' : ''}`}>
                                <span>Meta Diamante — 7% de comissão</span>
                                <span className="tabular-nums font-medium">{progressoDiamante.toFixed(0)}% de {formatCurrency(META_MENSAL_DIAMANTE)}</span>
                            </div>
                            <Progress value={progressoDiamante} className={`h-2.5 ${progressoOuro < 100 ? 'opacity-40' : ''}`} />
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/30 text-sm text-muted-foreground">
                            Nível atual: <span className="font-semibold text-foreground">{stats.comissao.nivel}</span>
                            {' '}— comissão de{' '}
                            <span className="font-semibold text-foreground">{(stats.comissao.taxa * 100).toFixed(0)}%</span>
                            {' '}sobre {formatCurrency(stats.faturado)} faturados.
                        </div>
                    </CardContent>
                </Card>

                {/* Lista de Próximos Eventos */}
                <Card className="border-glow bg-card">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-primary" />Minha agenda (Próximos)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[220px]">
                            {proximosEventos.length === 0 ? (
                                <p className="p-6 text-center text-muted-foreground text-sm">Nenhum evento agendado</p>
                            ) : (
                                proximosEventos.map(e => (
                                    <div key={e.id} className="px-5 py-3 border-b border-border/20 last:border-0 hover:bg-primary/5 transition-colors">
                                        <p className="text-sm font-medium truncate">{e.titulo}</p>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                            {new Date(e.dataInicio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            {e.clienteNome ? ` • ${e.clienteNome}` : ''}
                                        </p>
                                    </div>
                                ))
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {/* Linha 3: Gráfico Recharts de Atividades */}
            <Card className="border-glow bg-card w-full">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="h-4 w-4 text-indigo-500" />Resumo de Atividades (Geral)
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                    {eventsData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={eventsData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} barSize={50}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip
                                    cursor={{ fill: '#374151', opacity: 0.4 }}
                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '8px' }}
                                />
                                <Bar dataKey="quantidade" radius={[6, 6, 0, 0]}>
                                    {eventsData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                            Sua agenda está vazia. Comece a marcar visitas!
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
    );
}

// ── Sub-componente: Card KPI ───────────────────────────────────────────────
interface KpiCardProps { title: string; value: string; sub: string; icon: React.ElementType; iconClass: string; }
function KpiCard({ title, value, sub, icon: Icon, iconClass }: KpiCardProps) {
    return (
        <Card className="border-glow bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
            </CardHeader>
            <CardContent>
                <div className="text-xl font-bold tabular-nums">{value}</div>
                <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </CardContent>
        </Card>
    );
}