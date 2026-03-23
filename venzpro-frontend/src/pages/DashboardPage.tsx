import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrders } from "@/hooks/useOrders";
import { useEvents } from "@/hooks/useEvents";
import { useCustomers } from "@/hooks/useCustomers";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  DollarSign, ShoppingCart, Target, TrendingUp, Calendar as CalendarIcon,
  Trophy, Flame, Download, Users, AlertCircle, Medal
} from "lucide-react";
import { toast } from "sonner";

// Função utilitária para moeda
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { orders = [] } = useOrders();
  const { events = [] } = useEvents();
  const { customers = [] } = useCustomers();

  // --- REGRAS DE VISIBILIDADE (Cargos e Permissões) ---
  const isManagerOrAdmin = user?.role === "ADMIN" || user?.role === "GERENTE";
  const canExport = user?.podeExportar || user?.role === "ADMIN";
  const canApprove = user?.podeAprovar || isManagerOrAdmin;

  // --- CÁLCULOS DOS INDICADORES GERAIS ---
  const estatisticas = useMemo(() => {
    let faturado = 0;
    let emNegociacao = 0;
    let totalPedidosFechados = 0;

    orders.forEach(order => {
      if (order.status === "CONCLUIDO") {
        faturado += order.valorTotal;
        totalPedidosFechados += 1;
      }
      if (order.status === "ORCAMENTO" || order.status === "ENVIADO" || order.status === "APROVADO") {
        emNegociacao += order.valorTotal;
      }
    });

    const ticketMedio = totalPedidosFechados > 0 ? faturado / totalPedidosFechados : 0;
    return { faturado, emNegociacao, totalPedidosFechados, ticketMedio };
  }, [orders]);

  // --- CÁLCULO DO RANKING DA EQUIPE (Apenas Gerentes/Admins) ---
  const rankingEquipe = useMemo(() => {
    if (!isManagerOrAdmin) return [];

    const mapaVendedores = new Map<string, { nome: string; faturado: number; totalVendas: number }>();

    orders.forEach(o => {
      if (o.status === "CONCLUIDO" && o.user) {
        const atual = mapaVendedores.get(o.user.id) || { nome: o.user.nome, faturado: 0, totalVendas: 0 };
        mapaVendedores.set(o.user.id, {
          nome: atual.nome,
          faturado: atual.faturado + o.valorTotal,
          totalVendas: atual.totalVendas + 1
        });
      }
    });

    // Converte para Array, ordena do maior para o menor faturamento e pega os 5 melhores
    return Array.from(mapaVendedores.values())
        .sort((a, b) => b.faturado - a.faturado)
        .slice(0, 5);
  }, [orders, isManagerOrAdmin]);

  // --- AÇÕES PENDENTES (Geladeira) ---
  const clientesPendentes = useMemo(() => {
    return customers.filter(c => c.status === "PENDENTE").length;
  }, [customers]);

  // --- GAMIFICAÇÃO: SISTEMA DE METAS ---
  const META_MENSAL = 50000;
  const META_SUPER = 100000;

  const progressoMeta = Math.min((estatisticas.faturado / META_MENSAL) * 100, 100);
  const progressoSuper = Math.max(0, Math.min(((estatisticas.faturado - META_MENSAL) / (META_SUPER - META_MENSAL)) * 100, 100));

  let nivelComissao = "Base (3%)";
  let nivelColor = "text-gray-500";
  if (estatisticas.faturado >= META_MENSAL) {
    nivelComissao = "Ouro (5%)";
    nivelColor = "text-yellow-600";
  }
  if (estatisticas.faturado >= META_SUPER) {
    nivelComissao = "Diamante (7%)";
    nivelColor = "text-blue-600";
  }

  const eventosFuturos = events
      .filter(e => e.status === "AGENDADO")
      .sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime())
      .slice(0, 4);

  return (
      <div className="space-y-6">
        <PageHeader
            title={`Olá, ${user?.nome?.split(' ')[0]} 👋`}
            description={isManagerOrAdmin ? "Visão geral do desempenho da sua empresa." : "Aqui está o resumo da sua operação e o seu progresso neste mês."}
            action={
              <div className="flex gap-3">
                {/* BOTÃO ESCONDIDO: Exportar (Protegido por Permissão) */}
                {canExport && (
                    <Button variant="outline" className="bg-white gap-2" onClick={() => toast.success("Relatório gerado com sucesso!")}>
                      <Download className="h-4 w-4" /> Exportar Dados
                    </Button>
                )}
                <Badge variant="outline" className="px-3 py-1 bg-white flex items-center gap-2 text-sm shadow-sm border-blue-200">
                  <Trophy className={`h-4 w-4 ${nivelColor}`} />
                  Nível Atual: <span className="font-bold">{nivelComissao}</span>
                </Badge>
              </div>
            }
        />

        {/* LINHA 1: Cards de KPI Rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-gray-500">Faturado (Mês)</p>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">{formatCurrency(estatisticas.faturado)}</h2>
              <p className="text-xs text-emerald-600 font-medium flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1" /> Pedidos concluídos
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-gray-500">Em Negociação</p>
                <Target className="h-4 w-4 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">{formatCurrency(estatisticas.emNegociacao)}</h2>
              <p className="text-xs text-gray-500 mt-1">Orçamentos e pedidos em aprovação</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-gray-500">Vendas Fechadas</p>
                <ShoppingCart className="h-4 w-4 text-purple-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">{estatisticas.totalPedidosFechados}</h2>
              <p className="text-xs text-gray-500 mt-1">Volume total de notas emitidas</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-blue-800">Ticket Médio</p>
                <Flame className="h-4 w-4 text-orange-500" />
              </div>
              <h2 className="text-3xl font-bold text-blue-900">{formatCurrency(estatisticas.ticketMedio)}</h2>
              <p className="text-xs text-blue-600/80 mt-1 font-medium">Valor médio por cliente fechado</p>
            </CardContent>
          </Card>
        </div>

        {/* ÁREAS ESCONDIDAS (Apenas para Gestão e Permissões Especiais) */}
        {(isManagerOrAdmin || canApprove) && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* RANKING DA EQUIPE (Só Admin/Gerente) */}
              {isManagerOrAdmin && (
                  <Card className="lg:col-span-2 shadow-sm border-blue-100 bg-blue-50/30">
                    <CardHeader className="pb-3 border-b border-blue-100/50">
                      <CardTitle className="text-lg flex items-center gap-2 text-blue-900">
                        <Users className="h-5 w-5 text-blue-600" /> Ranking de Vendas da Equipe
                      </CardTitle>
                      <CardDescription>Os melhores vendedores do mês em faturamento.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      {rankingEquipe.length === 0 ? (
                          <div className="p-6 text-center text-sm text-gray-500">Ainda não há vendas fechadas neste mês.</div>
                      ) : (
                          <div className="divide-y divide-gray-100">
                            {rankingEquipe.map((vendedor, index) => (
                                <div key={index} className="flex items-center justify-between p-4 hover:bg-white transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className={`flex items-center justify-center h-8 w-8 rounded-full font-bold text-sm ${index === 0 ? 'bg-yellow-100 text-yellow-700' : index === 1 ? 'bg-gray-200 text-gray-700' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
                                      {index === 0 ? <Medal className="h-4 w-4" /> : `${index + 1}º`}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-gray-900 text-sm">{vendedor.nome}</p>
                                      <p className="text-xs text-gray-500">{vendedor.totalVendas} pedidos fechados</p>
                                    </div>
                                  </div>
                                  <div className="font-bold text-blue-700">
                                    {formatCurrency(vendedor.faturado)}
                                  </div>
                                </div>
                            ))}
                          </div>
                      )}
                    </CardContent>
                  </Card>
              )}

              {/* ALERTAS DA GELADEIRA (Para quem pode Aprovar) */}
              {canApprove && (
                  <Card className="shadow-sm border-orange-200 bg-orange-50/50">
                    <CardHeader className="pb-3 border-b border-orange-100">
                      <CardTitle className="text-lg flex items-center gap-2 text-orange-900">
                        <AlertCircle className="h-5 w-5 text-orange-600" /> Ações Pendentes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                      <div className="h-16 w-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-2xl font-bold mb-3 shadow-inner">
                        {clientesPendentes}
                      </div>
                      <h3 className="font-semibold text-gray-900">Clientes na Geladeira</h3>
                      <p className="text-sm text-gray-600 mt-1 mb-4">
                        Aguardando a sua revisão para liberar compras ou distribuir a um vendedor.
                      </p>
                      <Link to="/clientes">
                        <Button variant="default" className="w-full bg-orange-600 hover:bg-orange-700 text-white shadow-sm">
                          Revisar Clientes
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
              )}
            </div>
        )}

        {/* LINHA 3: Termômetro de Metas Pessoais & Agenda (Para todos) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-sm border-gray-200">
            <CardHeader className="pb-2 border-b border-gray-100 mb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-red-500" /> Aceleração de Metas (Suas Vendas)
              </CardTitle>
              <CardDescription>Acompanhe o seu progresso pessoal para subir de nível de comissão.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                <span className="text-gray-700 flex items-center gap-2">
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Meta Ouro</Badge>
                  Desbloqueia 5%
                </span>
                  <span className={progressoMeta >= 100 ? "text-green-600" : "text-gray-500"}>
                  {formatCurrency(estatisticas.faturado)} / {formatCurrency(META_MENSAL)}
                </span>
                </div>
                <Progress value={progressoMeta} className="h-3" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                <span className="text-gray-700 flex items-center gap-2">
                  <Badge variant="outline" className={progressoMeta >= 100 ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-100 text-gray-400"}>Meta Diamante</Badge>
                  Desbloqueia 7%
                </span>
                  <span className={progressoSuper >= 100 ? "text-green-600" : "text-gray-400"}>
                  {formatCurrency(Math.max(0, estatisticas.faturado - META_MENSAL))} / {formatCurrency(META_SUPER - META_MENSAL)}
                </span>
                </div>
                <Progress value={progressoSuper} className={`h-3 ${progressoMeta < 100 ? "opacity-30" : ""}`} />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200 flex flex-col">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-blue-600" /> Próximas Ações
                </div>
                <Link to="/agenda" className="text-xs text-blue-600 hover:underline font-medium">Ver tudo</Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-[240px]">
                {eventosFuturos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
                      <CalendarIcon className="h-10 w-10 mb-2 opacity-20" />
                      <p className="text-sm font-medium">Agenda livre!</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                      {eventosFuturos.map((evento) => {
                        const dataObj = new Date(evento.dataInicio);
                        const diaMes = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                        const hora = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        return (
                            <div key={evento.id} className="p-4 hover:bg-gray-50 transition-colors group">
                              <div className="flex justify-between items-start mb-1">
                                <h4 className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
                                  {evento.titulo}
                                </h4>
                                <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-white">
                                  {evento.tipo}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{diaMes} às {hora}</span>
                                {evento.customer?.nome && <span className="truncate max-w-[120px]">&bull; {evento.customer.nome}</span>}
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