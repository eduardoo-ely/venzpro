import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders } from '@/hooks/useOrders';
import { useEvents } from '@/hooks/useEvents';
import { useCustomers } from '@/hooks/useCustomers';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  DollarSign, ShoppingCart, Target, TrendingUp, Calendar as CalendarIcon,
  Trophy, Flame, Download, Users, AlertCircle, Medal,
} from 'lucide-react';
import { toast } from 'sonner';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function DashboardPage() {
  const { user } = useAuth();
  const { orders = [] }    = useOrders();
  const { events = [] }    = useEvents();
  const { customers = [] } = useCustomers();

  // Regras de visibilidade por cargo/permissão
  const isManagerOrAdmin  = user?.role === 'ADMIN' || user?.role === 'GERENTE';
  const canExport         = user?.podeExportar   || user?.role === 'ADMIN';
  const canApprove        = user?.podeAprovar    || isManagerOrAdmin;

  // KPIs calculados a partir dos campos corretos do Order
  const estatisticas = useMemo(() => {
    let faturado = 0;
    let emNegociacao = 0;
    let totalFechados = 0;

    orders.forEach(order => {
      if (order.status === 'CONCLUIDO') {
        faturado += order.valorTotal;
        totalFechados += 1;
      }
      if (['ORCAMENTO', 'ENVIADO', 'APROVADO'].includes(order.status)) {
        emNegociacao += order.valorTotal;
      }
    });

    const ticketMedio = totalFechados > 0 ? faturado / totalFechados : 0;
    return { faturado, emNegociacao, totalFechados, ticketMedio };
  }, [orders]);

  // Ranking por vendedorNome (campo desnormalizado do backend)
  const rankingEquipe = useMemo(() => {
    if (!isManagerOrAdmin) return [];

    const mapa = new Map<string, { nome: string; faturado: number; totalVendas: number }>();

    orders.forEach(o => {
      if (o.status === 'CONCLUIDO' && o.userId) {
        const chave = o.userId;
        const atual = mapa.get(chave) ?? { nome: o.vendedorNome ?? o.userId, faturado: 0, totalVendas: 0 };
        mapa.set(chave, {
          nome:        atual.nome,
          faturado:    atual.faturado + o.valorTotal,
          totalVendas: atual.totalVendas + 1,
        });
      }
    });

    return Array.from(mapa.values())
      .sort((a, b) => b.faturado - a.faturado)
      .slice(0, 5);
  }, [orders, isManagerOrAdmin]);

  const clientesPendentes = useMemo(
    () => customers.filter(c => c.status === 'PENDENTE').length,
    [customers]
  );

  // Gamificação de metas
  const META_MENSAL = 50_000;
  const META_SUPER  = 100_000;

  const progressoMeta  = Math.min((estatisticas.faturado / META_MENSAL) * 100, 100);
  const progressoSuper = Math.max(
    0,
    Math.min(((estatisticas.faturado - META_MENSAL) / (META_SUPER - META_MENSAL)) * 100, 100)
  );

  let nivelComissao = 'Base (3%)';
  let nivelColor    = 'text-muted-foreground';
  if (estatisticas.faturado >= META_MENSAL) { nivelComissao = 'Ouro (5%)';     nivelColor = 'text-yellow-500'; }
  if (estatisticas.faturado >= META_SUPER)  { nivelComissao = 'Diamante (7%)'; nivelColor = 'text-blue-400';  }

  const eventosFuturos = [...events]
    .filter(e => e.status === 'AGENDADO')
    .sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Olá, ${user?.nome?.split(' ')[0] ?? ''} 👋`}
        subtitle={
          isManagerOrAdmin
            ? 'Visão geral do desempenho da sua empresa.'
            : 'Resumo da sua operação e progresso neste mês.'
        }
      >
        <div className="flex gap-3 items-center">
          {canExport && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => toast.success('Relatório gerado com sucesso!')}
            >
              <Download className="h-4 w-4" /> Exportar Dados
            </Button>
          )}
          <Badge variant="outline" className="px-3 py-1 flex items-center gap-2 text-sm">
            <Trophy className={`h-4 w-4 ${nivelColor}`} />
            <span className="font-bold">{nivelComissao}</span>
          </Badge>
        </div>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-glow bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Faturado (Mês)</p>
              <DollarSign className="h-4 w-4 text-[hsl(160,84%,39%)]" />
            </div>
            <h2 className="text-2xl font-bold">{formatCurrency(estatisticas.faturado)}</h2>
            <p className="text-xs text-[hsl(160,84%,39%)] font-medium flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" /> Pedidos concluídos
            </p>
          </CardContent>
        </Card>

        <Card className="border-glow bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Em Negociação</p>
              <Target className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">{formatCurrency(estatisticas.emNegociacao)}</h2>
            <p className="text-xs text-muted-foreground mt-1">Orçamentos e pedidos em aprovação</p>
          </CardContent>
        </Card>

        <Card className="border-glow bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Vendas Fechadas</p>
              <ShoppingCart className="h-4 w-4 text-[hsl(258,90%,66%)]" />
            </div>
            <h2 className="text-2xl font-bold">{estatisticas.totalFechados}</h2>
            <p className="text-xs text-muted-foreground mt-1">Total de pedidos concluídos</p>
          </CardContent>
        </Card>

        <Card className="border-glow bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Ticket Médio</p>
              <Flame className="h-4 w-4 text-[hsl(38,92%,50%)]" />
            </div>
            <h2 className="text-2xl font-bold">{formatCurrency(estatisticas.ticketMedio)}</h2>
            <p className="text-xs text-muted-foreground mt-1">Valor médio por pedido fechado</p>
          </CardContent>
        </Card>
      </div>

      {/* Ranking + Geladeira (ADMIN/GERENTE ou quem pode aprovar) */}
      {(isManagerOrAdmin || canApprove) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {isManagerOrAdmin && (
            <Card className="lg:col-span-2 border-glow bg-card">
              <CardHeader className="pb-3 border-b border-border/30">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Ranking de Vendas da Equipe
                </CardTitle>
                <CardDescription>Os melhores vendedores do mês.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {rankingEquipe.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Ainda não há vendas fechadas neste mês.
                  </div>
                ) : (
                  <div className="divide-y divide-border/20">
                    {rankingEquipe.map((v, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 hover:bg-primary/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center justify-center h-8 w-8 rounded-full font-bold text-sm ${
                            idx === 0 ? 'bg-yellow-500/20 text-yellow-400'
                            : idx === 1 ? 'bg-muted text-muted-foreground'
                            : idx === 2 ? 'bg-orange-500/20 text-orange-400'
                            : 'bg-primary/10 text-primary'
                          }`}>
                            {idx === 0 ? <Medal className="h-4 w-4" /> : `${idx + 1}º`}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{v.nome}</p>
                            <p className="text-xs text-muted-foreground">{v.totalVendas} pedidos fechados</p>
                          </div>
                        </div>
                        <span className="font-bold text-primary">{formatCurrency(v.faturado)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {canApprove && (
            <Card className="border-glow bg-card border-[hsl(38_92%_50%/0.3)]">
              <CardHeader className="pb-3 border-b border-border/30">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-[hsl(38,92%,50%)]" /> Ações Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <div className="h-16 w-16 bg-[hsl(38_92%_50%/0.15)] rounded-full flex items-center justify-center text-2xl font-bold mb-3 text-[hsl(38,92%,50%)]">
                  {clientesPendentes}
                </div>
                <h3 className="font-semibold mb-1">Clientes Pendentes</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Aguardando revisão para liberar compras ou distribuir a um vendedor.
                </p>
                <Link to="/clientes">
                  <Button className="w-full bg-[hsl(38,92%,50%)] hover:bg-[hsl(38,92%,43%)] text-white border-0">
                    Revisar Clientes
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Metas + Agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-glow bg-card">
          <CardHeader className="pb-2 border-b border-border/30 mb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-destructive" /> Aceleração de Metas
            </CardTitle>
            <CardDescription>Acompanhe seu progresso para subir de nível de comissão.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">Meta Ouro</Badge>
                  Desbloqueia 5%
                </span>
                <span className={progressoMeta >= 100 ? 'text-[hsl(160,84%,39%)]' : 'text-muted-foreground'}>
                  {formatCurrency(estatisticas.faturado)} / {formatCurrency(META_MENSAL)}
                </span>
              </div>
              <Progress value={progressoMeta} className="h-3" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span className="flex items-center gap-2">
                  <Badge variant="outline" className={progressoMeta >= 100
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    : 'bg-muted text-muted-foreground'}>
                    Meta Diamante
                  </Badge>
                  Desbloqueia 7%
                </span>
                <span className={progressoSuper >= 100 ? 'text-[hsl(160,84%,39%)]' : 'text-muted-foreground'}>
                  {formatCurrency(Math.max(0, estatisticas.faturado - META_MENSAL))} / {formatCurrency(META_SUPER - META_MENSAL)}
                </span>
              </div>
              <Progress value={progressoSuper} className={`h-3 ${progressoMeta < 100 ? 'opacity-30' : ''}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-glow bg-card flex flex-col">
          <CardHeader className="pb-3 border-b border-border/30">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" /> Próximas Ações
              </div>
              <Link to="/agenda" className="text-xs text-primary hover:underline font-medium">
                Ver tudo
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-[240px]">
              {eventosFuturos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center">
                  <CalendarIcon className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm font-medium">Agenda livre!</p>
                </div>
              ) : (
                <div className="divide-y divide-border/20">
                  {eventosFuturos.map(evento => {
                    const d    = new Date(evento.dataInicio);
                    const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div key={evento.id} className="p-4 hover:bg-primary/5 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-semibold text-sm">{evento.titulo}</h4>
                          <Badge variant="outline" className="text-[10px]">{evento.tipo}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {data} às {hora}
                          </span>
                          {evento.clienteNome && (
                            <span className="truncate max-w-[120px]">• {evento.clienteNome}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
