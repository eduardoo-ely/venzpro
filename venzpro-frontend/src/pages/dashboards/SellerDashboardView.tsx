import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DollarSign, ShoppingCart, Target, Flame, Calendar as CalendarIcon, Trophy, Medal } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Order, Event } from '@/types';

interface SellerDashboardProps {
    orders: Order[];
    events: Event[];
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function SellerDashboardView({ orders, events }: SellerDashboardProps) {
    const META_MENSAL = 50_000;
    const META_SUPER  = 100_000;

    const stats = useMemo(() => {
        const faturado = orders.filter(o => o.status === 'CONCLUIDO').reduce((acc, o) => acc + o.valorTotal, 0);
        const emNegociacao = orders.filter(o => ['ORCAMENTO', 'ENVIADO', 'APROVADO'].includes(o.status)).reduce((acc, o) => acc + o.valorTotal, 0);
        const totalVendas = orders.filter(o => o.status === 'CONCLUIDO').length;
        const comissaoPrevista = faturado * 0.03; // Regra 15: Base 3%

        return { faturado, emNegociacao, totalVendas, comissaoPrevista };
    }, [orders]);

    const progressoMeta = Math.min((stats.faturado / META_MENSAL) * 100, 100);
    const progressoSuper = Math.max(0, Math.min(((stats.faturado - META_MENSAL) / (META_SUPER - META_MENSAL)) * 100, 100));

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="Meu Faturamento" value={formatCurrency(stats.faturado)} icon={DollarSign} color="text-emerald-500" />
                <KPICard title="Comissão Prevista (3%)" value={formatCurrency(stats.comissaoPrevista)} icon={Medal} color="text-blue-500" />
                <KPICard title="Em Negociação" value={formatCurrency(stats.emNegociacao)} icon={Target} color="text-primary" />
                <KPICard title="Vendas Fechadas" value={stats.totalVendas.toString()} icon={ShoppingCart} color="text-purple-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-glow bg-card">
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-destructive" />Minhas Metas</CardTitle></CardHeader>
                    <CardContent className="space-y-8">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm"><span>Meta Ouro (5% comissão)</span><span>{progressoMeta.toFixed(0)}%</span></div>
                            <Progress value={progressoMeta} className="h-3" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm"><span>Meta Diamante (7% comissão)</span><span>{progressoSuper.toFixed(0)}%</span></div>
                            <Progress value={progressoSuper} className={`h-3 ${progressoMeta < 100 ? 'opacity-30' : ''}`} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-glow bg-card">
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-primary" />Minha Agenda</CardTitle></CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[200px]">
                            {events.length === 0 ? <p className="p-6 text-center text-muted-foreground text-sm">Agenda livre</p> :
                                events.map(e => (
                                    <div key={e.id} className="p-4 border-b border-border/20 hover:bg-primary/5">
                                        <p className="text-sm font-semibold">{e.titulo}</p>
                                        <p className="text-[10px] text-muted-foreground">{new Date(e.dataInicio).toLocaleDateString()}</p>
                                    </div>
                                ))
                            }
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function KPICard({ title, value, icon: Icon, color }: any) {
    return (
        <Card className="border-glow bg-card">
            <CardContent className="p-6">
                <div className="flex items-center justify-between pb-2">
                    <p className="text-xs font-medium text-muted-foreground">{title}</p>
                    <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <h2 className="text-xl font-bold">{value}</h2>
            </CardContent>
        </Card>
    );
}