import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { Users, DollarSign, ShoppingBag, TrendingUp, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function ManagerDashboardView() {
    const { user } = useAuth();

    // NOTA DO SÉNIOR: Numa implementação real, estes dados virão do teu hook,
    // por exemplo: const { data: stats, isLoading } = useManagerStats();
    const mockStats = {
        totalVendasMes: 'R$ 145.200,00',
        crescimentoVendas: '+12.5%',
        pedidosPendentes: 24,
        clientesAguardandoAprovacao: 5,
        equipaAtiva: 8,
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Painel de Gestão</h2>
                <p className="text-muted-foreground">
                    Bem-vindo de volta, {user?.name || 'Gerente'}. Aqui está o resumo da sua equipa hoje.
                </p>
            </div>

            {/* ─── KPIs (Indicadores Principais) ────────────────────────────────────── */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Faturação da Equipa</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{mockStats.totalVendasMes}</div>
                        <p className="text-xs text-muted-foreground">
                            {mockStats.crescimentoVendas} em relação ao mês passado
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pedidos Pendentes</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{mockStats.pedidosPendentes}</div>
                        <p className="text-xs text-muted-foreground">
                            Aguardando faturação ou envio
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Aprovação de Clientes</CardTitle>
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{mockStats.clientesAguardandoAprovacao}</div>
                        <p className="text-xs text-muted-foreground">
                            Novos registos a exigir revisão (RN 6)
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vendedores Ativos</CardTitle>
                        <Users className="h-4 w-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{mockStats.equipaAtiva}</div>
                        <p className="text-xs text-muted-foreground">
                            Representantes com vendas este mês
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* ─── Visão Detalhada da Equipa ────────────────────────────────────────── */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Performance de Vendas</CardTitle>
                        <CardDescription>Evolução diária da equipa comercial.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2 flex h-[300px] items-center justify-center border-t">
                        {/* Aqui podes integrar o Recharts depois */}
                        <div className="flex flex-col items-center text-muted-foreground">
                            <TrendingUp className="h-10 w-10 mb-2 opacity-20" />
                            <span>O gráfico de barras será renderizado aqui</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Top Vendedores</CardTitle>
                        <CardDescription>Ranking de performance no mês atual.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {[
                                { name: 'João Silva', sales: 'R$ 45.000', orders: 32 },
                                { name: 'Maria Santos', sales: 'R$ 38.500', orders: 28 },
                                { name: 'Carlos Ferreira', sales: 'R$ 21.200', orders: 15 },
                            ].map((seller, index) => (
                                <div key={index} className="flex items-center">
                                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                        {seller.name.charAt(0)}
                                    </div>
                                    <div className="ml-4 space-y-1">
                                        <p className="text-sm font-medium leading-none">{seller.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {seller.orders} pedidos
                                        </p>
                                    </div>
                                    <div className="ml-auto font-medium">{seller.sales}</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}