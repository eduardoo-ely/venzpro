import React, { useState, useMemo } from 'react';
import { useOrders }    from '@/hooks/useOrders';
import { useAuth }      from '@/contexts/AuthContext';
import { PageHeader }   from '@/components/PageHeader';
import { Button }       from '@/components/ui/button';
import { Input }        from '@/components/ui/input';
import { Label }        from '@/components/ui/label';
import { Badge }        from '@/components/ui/badge';
import { Textarea }     from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search, Plus, Eye, Loader2, Filter, Package, User, Building2,
  ArrowRight, CheckCircle2, XCircle, Send, Ban, Truck, ChevronRight,
  AlertCircle, Clock,
} from 'lucide-react';
import { NovoPedidoSheet } from '@/components/NovoPedidoSheet';
import type { Order, OrderStatus } from '@/types';
import { toast } from 'sonner';

// ── Configuração visual de status ─────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, {
  label:      string;
  badgeClass: string;
  icon:       React.ElementType;
}> = {
  ORCAMENTO: { label: 'Orçamento', badgeClass: 'status-orcamento', icon: Clock        },
  ENVIADO:   { label: 'Enviado',   badgeClass: 'status-enviado',   icon: Send         },
  APROVADO:  { label: 'Aprovado',  badgeClass: 'status-aprovado',  icon: CheckCircle2 },
  CONCLUIDO: { label: 'Concluído', badgeClass: 'status-concluido', icon: Truck        },
  REJEITADO: { label: 'Rejeitado', badgeClass: 'status-rejeitado', icon: XCircle      },
  CANCELADO: { label: 'Cancelado', badgeClass: 'status-cancelado', icon: Ban          },
};

/**
 * Transições de status permitidas conforme RN §12.
 * Espelha o mapa do backend (OrderService.TRANSICOES_VALIDAS).
 */
const TRANSICOES: Record<OrderStatus, OrderStatus[]> = {
  ORCAMENTO: ['ENVIADO',   'CANCELADO'],
  ENVIADO:   ['APROVADO',  'REJEITADO', 'CANCELADO'],
  APROVADO:  ['CONCLUIDO', 'CANCELADO'],
  REJEITADO: [],
  CONCLUIDO: [],
  CANCELADO: [],
};

/** Rótulo amigável para os botões de ação */
const ACAO_LABEL: Partial<Record<OrderStatus, string>> = {
  ENVIADO:   'Enviar para aprovação',
  APROVADO:  'Aprovar pedido',
  CONCLUIDO: 'Marcar como concluído',
  REJEITADO: 'Rejeitar pedido',
  CANCELADO: 'Cancelar pedido',
};

/** Status que OBRIGATORIAMENTE exigem motivo */
const REQUER_MOTIVO: OrderStatus[] = ['CANCELADO', 'REJEITADO'];

// Cancelar pedido APROVADO também exige motivo (validado no backend)
// mas incluímos aqui para o frontend já exibir o campo.
const motivoObrigatorio = (atual: OrderStatus, destino: OrderStatus): boolean => {
  if (REQUER_MOTIVO.includes(destino)) return true;
  if (atual === 'APROVADO' && destino === 'CANCELADO') return true;
  return false;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (dateString?: string | null) => {
  if (!dateString) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
};

// ── Sub-componente: badge de status ──────────────────────────────────────────

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg  = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
      <Badge variant="outline" className={`${cfg.badgeClass} text-[10px] font-semibold flex items-center gap-1 w-fit`}>
        <Icon className="h-3 w-3" />{cfg.label}
      </Badge>
  );
}

// ── Sub-componente: stepper de progresso do pedido ───────────────────────────

const STATUS_FLOW: OrderStatus[] = ['ORCAMENTO', 'ENVIADO', 'APROVADO', 'CONCLUIDO'];

function OrderStepper({ status }: { status: OrderStatus }) {
  const isTerminal = status === 'REJEITADO' || status === 'CANCELADO';
  const currentIdx = STATUS_FLOW.indexOf(status);

  if (isTerminal) {
    const cfg  = STATUS_CONFIG[status];
    const Icon = cfg.icon;
    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${cfg.badgeClass}`}>
          <Icon className="h-4 w-4" />
          Pedido {cfg.label} — status terminal
        </div>
    );
  }

  return (
      <div className="flex items-center gap-1">
        {STATUS_FLOW.map((s, i) => {
          const cfg      = STATUS_CONFIG[s];
          const Icon     = cfg.icon;
          const isDone   = i < currentIdx;
          const isCurrent= i === currentIdx;

          return (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    isCurrent
                        ? `${cfg.badgeClass} shadow-sm`
                        : isDone
                            ? 'bg-[hsl(160_84%_39%/0.1)] text-[hsl(160,84%,39%)] border-[hsl(160_84%_39%/0.2)]'
                            : 'bg-muted/30 text-muted-foreground border-border/30'
                }`}>
                  <Icon className="h-3 w-3" />
                  {cfg.label}
                </div>
                {i < STATUS_FLOW.length - 1 && (
                    <ChevronRight className={`h-3 w-3 shrink-0 ${isDone ? 'text-[hsl(160,84%,39%)]' : 'text-muted-foreground/30'}`} />
                )}
              </React.Fragment>
          );
        })}
      </div>
  );
}

// ── Sub-componente: painel de ações de status ─────────────────────────────────

interface StatusActionsProps {
  order:        Order;
  onTransition: (novoStatus: OrderStatus, motivo?: string) => void;
  isPending:    boolean;
}

function StatusActions({ order, onTransition, isPending }: StatusActionsProps) {
  const transicoes = TRANSICOES[order.status] ?? [];
  const [motivo,    setMotivo]    = useState('');
  const [ativo,     setAtivo]     = useState<OrderStatus | null>(null);

  if (transicoes.length === 0) return null;

  const confirmar = () => {
    if (!ativo) return;
    if (motivoObrigatorio(order.status, ativo) && !motivo.trim()) {
      toast.error('O motivo é obrigatório para esta ação.');
      return;
    }
    onTransition(ativo, motivo.trim() || undefined);
    setAtivo(null);
    setMotivo('');
  };

  return (
      <div className="space-y-3">
        {/* Botões de ação */}
        <div className="flex flex-wrap gap-2">
          {transicoes.map(destino => {
            const cfg  = STATUS_CONFIG[destino];
            const Icon = cfg.icon;
            const isDestructive = destino === 'CANCELADO' || destino === 'REJEITADO';
            return (
                <Button
                    key={destino}
                    size="sm"
                    variant={isDestructive ? 'outline' : 'default'}
                    disabled={isPending}
                    onClick={() => setAtivo(destino)}
                    className={
                      isDestructive
                          ? 'border-destructive/30 text-destructive hover:bg-destructive/10 h-8 text-xs'
                          : 'gradient-primary border-0 text-white h-8 text-xs shadow-sm shadow-primary/20'
                    }
                >
                  {isPending && ativo === destino
                      ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                      : <Icon className="h-3 w-3 mr-1.5" />
                  }
                  {ACAO_LABEL[destino] ?? cfg.label}
                </Button>
            );
          })}
        </div>

        {/* Painel de confirmação com motivo */}
        {ativo && (
            <div className="border border-border/50 rounded-lg p-4 bg-muted/20 space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">
                  Confirmar: {ACAO_LABEL[ativo] ?? STATUS_CONFIG[ativo].label}?
                </p>
              </div>

              {motivoObrigatorio(order.status, ativo) && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Motivo <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                        value={motivo}
                        onChange={e => setMotivo(e.target.value)}
                        placeholder="Descreva o motivo..."
                        rows={3}
                        className="bg-muted border-border/50 text-sm resize-none"
                    />
                  </div>
              )}

              {!motivoObrigatorio(order.status, ativo) && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Observação (opcional)</Label>
                    <Textarea
                        value={motivo}
                        onChange={e => setMotivo(e.target.value)}
                        placeholder="Adicione uma observação se necessário..."
                        rows={2}
                        className="bg-muted border-border/50 text-sm resize-none"
                    />
                  </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setAtivo(null); setMotivo(''); }}
                    className="h-8 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                    size="sm"
                    onClick={confirmar}
                    disabled={isPending || (motivoObrigatorio(order.status, ativo) && !motivo.trim())}
                    className={
                      (ativo === 'CANCELADO' || ativo === 'REJEITADO')
                          ? 'bg-destructive text-white hover:bg-destructive/90 h-8 text-xs'
                          : 'gradient-primary border-0 text-white h-8 text-xs'
                    }
                >
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Confirmar
                </Button>
              </div>
            </div>
        )}
      </div>
  );
}

// ── Modal de detalhes do pedido ───────────────────────────────────────────────

interface OrderDetailModalProps {
  order:    Order | null;
  open:     boolean;
  onClose:  () => void;
}

function OrderDetailModal({ order, open, onClose }: OrderDetailModalProps) {
  const { updateStatus } = useOrders();

  if (!order) return null;

  const handleTransition = (novoStatus: OrderStatus, motivo?: string) => {
    updateStatus.mutate(
        { id: order.id, status: novoStatus, motivo },
        {
          onSuccess: () => {
            toast.success(`Pedido ${STATUS_CONFIG[novoStatus].label.toLowerCase()} com sucesso!`);
            onClose();
          },
        }
    );
  };

  return (
      <Dialog open={open} onOpenChange={v => !v && onClose()}>
        <DialogContent className="border-glow bg-card max-w-2xl max-h-[90vh] p-0 flex flex-col">
          {/* Cabeçalho */}
          <DialogHeader className="p-6 pb-0 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Pedido #{order.id.substring(0, 8).toUpperCase()}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Criado em {formatDate(order.createdAt)}
                </DialogDescription>
              </div>
              <StatusBadge status={order.status} />
            </div>

            {/* Stepper de progresso */}
            <div className="mt-4 overflow-x-auto pb-1">
              <OrderStepper status={order.status} />
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6">
            <div className="py-4 space-y-5">

              {/* Partes envolvidas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 p-4 rounded-xl bg-muted/30 border border-border/30">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    <User className="h-3.5 w-3.5" />Cliente
                  </div>
                  <p className="text-sm font-semibold">{order.clienteNome}</p>
                  <p className="text-xs text-muted-foreground">
                    Vendedor: {order.vendedorNome}
                  </p>
                </div>

                <div className="space-y-1.5 p-4 rounded-xl bg-muted/30 border border-border/30">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    <Building2 className="h-3.5 w-3.5" />Empresa
                  </div>
                  <p className="text-sm font-semibold">{order.empresaNome}</p>
                </div>
              </div>

              {/* Observações do pedido */}
              {order.descricao && (
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1.5">
                      Observações
                    </p>
                    <p className="text-sm text-foreground/80">{order.descricao}</p>
                  </div>
              )}

              {/* Itens do pedido */}
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">
                  Itens ({order.items?.length ?? 0})
                </p>
                <div className="rounded-xl border border-border/40 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                    <tr className="border-b border-border/30 bg-muted/20">
                      <th className="text-left text-xs text-muted-foreground font-medium p-3">Produto</th>
                      <th className="text-right text-xs text-muted-foreground font-medium p-3">Qtd</th>
                      <th className="text-right text-xs text-muted-foreground font-medium p-3">Unit.</th>
                      <th className="text-right text-xs text-muted-foreground font-medium p-3">Subtotal</th>
                    </tr>
                    </thead>
                    <tbody>
                    {(order.items ?? []).map((item, i) => (
                        <tr
                            key={item.id}
                            className={`border-b border-border/20 last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}
                        >
                          <td className="p-3 font-medium">{item.nomeProduto}</td>
                          <td className="p-3 text-right tabular-nums text-muted-foreground">
                            {Number(item.quantidade).toLocaleString('pt-BR')}
                          </td>
                          <td className="p-3 text-right tabular-nums text-muted-foreground">
                            {formatCurrency(item.precoUnitario)}
                          </td>
                          <td className="p-3 text-right tabular-nums font-semibold">
                            {formatCurrency(item.subtotal)}
                          </td>
                        </tr>
                    ))}
                    </tbody>
                    <tfoot>
                    <tr className="border-t border-border/40 bg-muted/20">
                      <td colSpan={3} className="p-3 text-right text-sm font-semibold">
                        Total
                      </td>
                      <td className="p-3 text-right text-base font-bold tabular-nums">
                        {formatCurrency(order.valorTotal)}
                      </td>
                    </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Histórico de cancelamento / rejeição */}
              {(order.motivoCancelamento || order.canceladoEm) && (
                  <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                    <p className="text-xs text-destructive font-medium uppercase tracking-wider mb-1.5">
                      Motivo do {order.status === 'REJEITADO' ? 'rejeição' : 'cancelamento'}
                    </p>
                    {order.canceladoEm && (
                        <p className="text-xs text-muted-foreground mb-1">
                          Em {formatDate(order.canceladoEm)}
                        </p>
                    )}
                    {order.motivoCancelamento && (
                        <p className="text-sm text-foreground/80">{order.motivoCancelamento}</p>
                    )}
                  </div>
              )}

              {/* Ações de transição de status */}
              <div>
                <Separator className="mb-4" />
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">
                  Ações disponíveis
                </p>
                <StatusActions
                    order={order}
                    onTransition={handleTransition}
                    isPending={updateStatus.isPending}
                />
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function PedidosPage() {
  const { user }       = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');

  const { orders, isLoading } = useOrders(
      statusFilter === 'TODOS' ? undefined : statusFilter as OrderStatus
  );

  const [searchTerm,  setSearchTerm]  = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    // 1. Adicionada a validação de Array.isArray
    if (!orders || !Array.isArray(orders)) return [];

    const lowerTerm = searchTerm.toLowerCase();
    return orders.filter(o => {
      const matchSearch =
          (o.clienteNome   ?? '').toLowerCase().includes(lowerTerm) ||
          (o.vendedorNome  ?? '').toLowerCase().includes(lowerTerm) ||
          (o.empresaNome   ?? '').toLowerCase().includes(lowerTerm) ||
          (o.id            ?? '').toLowerCase().includes(lowerTerm);
      const matchStatus = statusFilter === 'TODOS' || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  // KPIs rápidos no topo
  const kpis = useMemo(() => {
    // 2. Adicionada a validação de Array.isArray
    if (!orders || !Array.isArray(orders)) return { total: 0, abertos: 0, valorTotal: 0 };

    return {
      total:      orders.length,
      abertos:    orders.filter(o => ['ORCAMENTO', 'ENVIADO', 'APROVADO'].includes(o.status)).length,
      valorTotal: orders
          .filter(o => o.status === 'CONCLUIDO')
          .reduce((acc, o) => acc + o.valorTotal, 0),
    };
  }, [orders]);

  return (
      <div className="space-y-6">
        <PageHeader
            title="Central de Pedidos"
            subtitle="Acompanhe e gerencie o fluxo completo de orçamentos e vendas"
        >
          <Button
              className="gradient-primary border-0 text-white gap-2 shadow-lg shadow-primary/25"
              onClick={() => setIsSheetOpen(true)}
          >
            <Plus className="h-4 w-4" />Novo Pedido
          </Button>
        </PageHeader>

        {/* KPIs rápidos */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total de pedidos',  value: kpis.total,                       suffix: '' },
            { label: 'Em andamento',      value: kpis.abertos,                     suffix: '' },
            { label: 'Faturado (concluído)', value: formatCurrency(kpis.valorTotal), suffix: '' },
          ].map(kpi => (
              <div
                  key={kpi.label}
                  className="bg-card border border-border/50 rounded-xl p-4"
              >
                <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                <p className="text-xl font-bold tabular-nums">
                  {typeof kpi.value === 'number' ? kpi.value : kpi.value}
                </p>
              </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-card p-4 rounded-xl border border-border/50">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Buscar por cliente, vendedor, empresa ou código..."
                className="pl-9 bg-muted border-border/50"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-56 flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-muted border-border/50">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os status</SelectItem>
                {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map(s => (
                    <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabela de pedidos */}
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground">Data / Código</TableHead>
                <TableHead className="text-xs text-muted-foreground">Cliente</TableHead>
                <TableHead className="text-xs text-muted-foreground">Vendedor</TableHead>
                <TableHead className="text-xs text-muted-foreground">Valor Total</TableHead>
                <TableHead className="text-xs text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs text-muted-foreground text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Carregando pedidos...
                    </TableCell>
                  </TableRow>
              ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                      {searchTerm || statusFilter !== 'TODOS'
                          ? 'Nenhum pedido encontrado com estes filtros.'
                          : 'Nenhum pedido cadastrado. Crie o primeiro!'
                      }
                    </TableCell>
                  </TableRow>
              ) : (
                  filtered.map(order => (
                      <TableRow
                          key={order.id}
                          className="border-border/20 hover:bg-primary/5 transition-colors cursor-pointer"
                          onClick={() => setDetailOrder(order)}
                      >
                        <TableCell>
                          <div className="font-medium text-sm">{formatDate(order.createdAt)}</div>
                          <div className="text-xs text-muted-foreground font-mono uppercase">
                            #{order.id.substring(0, 8)}
                          </div>
                        </TableCell>

                        <TableCell>
                          <p className="font-medium text-sm">{order.clienteNome ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{order.empresaNome ?? '—'}</p>
                        </TableCell>

                        <TableCell className="text-sm text-muted-foreground">
                          {order.vendedorNome ?? '—'}
                        </TableCell>

                        <TableCell className="font-bold tabular-nums">
                          {formatCurrency(order.valorTotal)}
                        </TableCell>

                        <TableCell>
                          <StatusBadge status={order.status} />
                        </TableCell>

                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs border-primary/30 text-primary hover:bg-primary/10"
                              onClick={() => setDetailOrder(order)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1.5" />Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Modal de detalhes + controle de status */}
        <OrderDetailModal
            order={detailOrder}
            open={!!detailOrder}
            onClose={() => setDetailOrder(null)}
        />

        {/* Sheet de novo pedido */}
        <NovoPedidoSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} />
      </div>
  );
}