import { useState } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { useCustomers } from '@/hooks/useCustomers';
import { useCompanies } from '@/hooks/useCompanies';
import { useProducts } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Pencil, Trash2, LayoutGrid, List, Package, GripVertical, Lock } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { AvatarInitials } from '@/components/AvatarInitials';
import { motion } from 'framer-motion';
import type { CreateOrderPayload, Order, OrderStatus } from '@/types';

// ── Configuração visual dos status ────────────────────────────────────────────

const statusConfig: Record<OrderStatus, { label: string; class: string; color: string }> = {
  ORCAMENTO: { label: 'Orçamento', class: 'status-orcamento', color: 'hsl(38 92% 50%)'  },
  ENVIADO:   { label: 'Enviado',   class: 'status-enviado',   color: 'hsl(217 91% 60%)' },
  APROVADO:  { label: 'Aprovado',  class: 'status-aprovado',  color: 'hsl(160 84% 39%)' },
  REJEITADO: { label: 'Rejeitado', class: 'status-rejeitado', color: 'hsl(0 72% 51%)'   },
  CONCLUIDO: { label: 'Concluído', class: 'status-concluido', color: 'hsl(142 71% 45%)' },
  CANCELADO: { label: 'Cancelado', class: 'status-cancelado', color: 'hsl(0 84% 60%)'   },
};

// ── Mapa de transições válidas — espelha o backend ────────────────────────────

const TRANSICOES_VALIDAS: Record<OrderStatus, OrderStatus[]> = {
  ORCAMENTO: ['ENVIADO', 'CANCELADO'],
  ENVIADO:   ['APROVADO', 'REJEITADO', 'CANCELADO'],
  APROVADO:  ['CONCLUIDO', 'CANCELADO'],
  REJEITADO: [],
  CONCLUIDO: [],
  CANCELADO: [],
};

// Label humanizado das ações de transição
const ACAO_LABEL: Partial<Record<OrderStatus, string>> = {
  ENVIADO:   'Enviar',
  APROVADO:  'Aprovar',
  REJEITADO: 'Rejeitar',
  CONCLUIDO: 'Concluir',
  CANCELADO: 'Cancelar',
};

// Classe de cor de cada ação
const ACAO_CLASS: Partial<Record<OrderStatus, string>> = {
  ENVIADO:   'text-[hsl(217,91%,60%)]',
  APROVADO:  'text-[hsl(160,84%,39%)]',
  REJEITADO: 'text-[hsl(0,72%,51%)]',
  CONCLUIDO: 'text-[hsl(142,71%,45%)]',
  CANCELADO: 'text-destructive',
};

// ── Tipos internos ────────────────────────────────────────────────────────────

type Form = {
  customerId: string;
  companyId:  string;
  descricao:  string;
  productId:  string;
  quantidade: string;
};

type CancelacaoState = {
  open:    boolean;
  orderId: string | null;
  motivo:  string;
};

const emptyForm = (): Form => ({
  customerId: '', companyId: '', descricao: '', productId: '', quantidade: '1',
});

// ── Componente principal ──────────────────────────────────────────────────────

export default function PedidosPage() {
  const { orders, isLoading, create, update, updateStatus, remove } = useOrders();
  const { customers, isLoading: loadingC }  = useCustomers();
  const { companies, isLoading: loadingCo } = useCompanies();
  const { products,  isLoading: loadingP }  = useProducts();

  const [open,       setOpen]       = useState(false);
  const [editing,    setEditing]    = useState<Order | null>(null);
  const [viewMode,   setViewMode]   = useState<'kanban' | 'table'>('kanban');
  const [form,       setForm]       = useState<Form>(emptyForm());
  const [cancelacao, setCancelacao] = useState<CancelacaoState>({
    open: false, orderId: null, motivo: '',
  });

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /** Pedido pode ser editado apenas em ORCAMENTO */
  const podeEditar = (order: Order) => order.status === 'ORCAMENTO';

  // ── Handlers — formulário ────────────────────────────────────────────────────

  const openNew = () => { setEditing(null); setForm(emptyForm()); setOpen(true); };

  const openEdit = (order: Order) => {
    // Segurança extra no frontend: não abre o modal se não pode editar
    if (!podeEditar(order)) return;
    const firstItem = order.items[0];
    setEditing(order);
    setForm({
      customerId: order.customerId,
      companyId:  order.companyId,
      descricao:  order.descricao ?? '',
      productId:  firstItem?.productId ?? '',
      quantidade: firstItem ? String(firstItem.quantidade) : '1',
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: CreateOrderPayload = {
      customerId: form.customerId,
      companyId:  form.companyId,
      descricao:  form.descricao || undefined,
      items: [{ productId: form.productId, quantidade: Number(form.quantidade) || 1 }],
    };
    if (editing) await update.mutateAsync({ id: editing.id, ...payload });
    else         await create.mutateAsync(payload);
    setOpen(false);
  };

  // ── Handlers — status ────────────────────────────────────────────────────────

  const handleTransicao = (order: Order, novoStatus: OrderStatus) => {
    if (novoStatus === 'CANCELADO' && order.status === 'APROVADO') {
      setCancelacao({ open: true, orderId: order.id, motivo: '' });
      return;
    }
    updateStatus.mutate({ id: order.id, status: novoStatus });
  };

  const handleConfirmarCancelamento = () => {
    if (!cancelacao.orderId) return;
    updateStatus.mutate({ id: cancelacao.orderId, status: 'CANCELADO', motivo: cancelacao.motivo });
    setCancelacao({ open: false, orderId: null, motivo: '' });
  };

  const isPending    = create.isPending || update.isPending;
  const isLoadingAll = isLoading || loadingC || loadingCo || loadingP;
  const columns: OrderStatus[] = ['ORCAMENTO', 'ENVIADO', 'APROVADO', 'REJEITADO', 'CONCLUIDO', 'CANCELADO'];

  // ── Sub-componente: botão de edição com tooltip quando bloqueado ─────────────

  const BotaoEditar = ({ order, variant }: { order: Order; variant: 'icon' | 'sm' }) => {
    const pode = podeEditar(order);
    const btn = variant === 'icon'
        ? (
            <Button variant="ghost" size="icon"
                    className={`h-8 w-8 ${!pode ? 'opacity-40 cursor-not-allowed' : ''}`}
                    onClick={() => pode && openEdit(order)}
                    disabled={!pode}
            >
              {pode ? <Pencil className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            </Button>
        ) : (
            <Button variant="ghost" size="sm"
                    className={`text-xs h-7 ${!pode ? 'opacity-40 cursor-not-allowed' : ''}`}
                    onClick={() => pode && openEdit(order)}
                    disabled={!pode}
            >
              {pode
                  ? <><Pencil className="h-3 w-3 mr-1" />Editar</>
                  : <><Lock   className="h-3 w-3 mr-1" />Bloqueado</>
              }
            </Button>
        );

    if (pode) return btn;

    return (
        <Tooltip>
          <TooltipTrigger asChild>{btn}</TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-[200px] text-center">
            Apenas pedidos em Orçamento podem ser editados.<br />
            Status atual: {statusConfig[order.status].label}
          </TooltipContent>
        </Tooltip>
    );
  };

  // ── Sub-componente: ações de transição do kanban ─────────────────────────────

  const AcoesKanban = ({ order }: { order: Order }) => {
    const proximos = TRANSICOES_VALIDAS[order.status];
    if (!proximos.length) return null;
    return (
        <div className="flex gap-1 mt-3 flex-wrap opacity-0 group-hover:opacity-100 transition-opacity">
          {proximos.map(novoStatus => (
              <Button key={novoStatus} size="sm" variant="ghost"
                      className={`h-6 text-[10px] ${ACAO_CLASS[novoStatus] ?? ''}`}
                      disabled={updateStatus.isPending}
                      onClick={e => { e.stopPropagation(); handleTransicao(order, novoStatus); }}
              >
                {ACAO_LABEL[novoStatus]}
              </Button>
          ))}
        </div>
    );
  };

  // ── JSX principal ─────────────────────────────────────────────────────────────

  return (
      <div className="space-y-6">
        <PageHeader title="Pedidos" subtitle="Gerencie seus pedidos e orçamentos">
          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
            <Button variant={viewMode === 'kanban' ? 'default' : 'ghost'} size="icon"
                    className={`h-8 w-8 ${viewMode === 'kanban' ? 'gradient-primary border-0' : ''}`}
                    onClick={() => setViewMode('kanban')}><LayoutGrid className="h-4 w-4" /></Button>
            <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="icon"
                    className={`h-8 w-8 ${viewMode === 'table' ? 'gradient-primary border-0' : ''}`}
                    onClick={() => setViewMode('table')}><List className="h-4 w-4" /></Button>
          </div>
          <Button onClick={openNew} className="gradient-primary border-0 text-white shadow-lg shadow-primary/25">
            <Plus className="h-4 w-4 mr-2" />Novo Pedido
          </Button>
        </PageHeader>

        {isLoadingAll && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="border-glow bg-card">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-1 flex-1">
                          <Skeleton className="h-3 w-3/4" /><Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-1/3" />
                    </CardContent>
                  </Card>
              ))}
            </div>
        )}

        {!isLoadingAll && orders.length === 0 && (
            <EmptyState icon={Package} title="Nenhum pedido encontrado"
                        description="Crie seu primeiro pedido para começar a gerenciar suas vendas."
                        actionLabel="Novo Pedido" onAction={openNew} />
        )}

        {/* Modo kanban */}
        {!isLoadingAll && orders.length > 0 && viewMode === 'kanban' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {columns.map(col => {
                const colOrders = orders.filter(o => o.status === col);
                const cfg = statusConfig[col];
                return (
                    <div key={col} className="flex flex-col">
                      <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ background: cfg.color }} />
                          <span className="text-sm font-semibold">{cfg.label}</span>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {colOrders.length}
                    </span>
                        </div>
                        {/* Só ORCAMENTO tem atalho de criar */}
                        {col === 'ORCAMENTO' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={openNew}>
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                        )}
                      </div>
                      <div className="space-y-2 flex-1">
                        {colOrders.map(order => (
                            <motion.div key={order.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                              <Card
                                  className={`border-glow bg-card group ${podeEditar(order) ? 'cursor-pointer' : 'cursor-default'}`}
                                  onClick={() => podeEditar(order) && openEdit(order)}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <AvatarInitials name={order.clienteNome || 'C'} size="sm" />
                                      <div>
                                        <p className="text-sm font-medium">{order.clienteNome || order.customerId}</p>
                                        <p className="text-[10px] text-muted-foreground">{order.empresaNome || order.companyId}</p>
                                      </div>
                                    </div>
                                    {/* Ícone de cadeado para pedidos não editáveis */}
                                    {!podeEditar(order)
                                        ? <Lock className="h-3.5 w-3.5 text-muted-foreground/40" />
                                        : <GripVertical className="h-4 w-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    }
                                  </div>
                                  <div className="space-y-1 mt-3">
                            <span className="text-lg font-bold">
                              R$ {Number(order.valorTotal).toFixed(2)}
                            </span>
                                    <p className="text-[10px] text-muted-foreground">{order.items.length} item(ns)</p>
                                    <span className="text-[10px] text-muted-foreground block">
                              {order.createdAt ? new Date(order.createdAt).toLocaleDateString('pt-BR') : ''}
                            </span>
                                  </div>
                                  {/* Ações de transição geradas dinamicamente */}
                                  <AcoesKanban order={order} />
                                </CardContent>
                              </Card>
                            </motion.div>
                        ))}
                      </div>
                    </div>
                );
              })}
            </div>
        )}

        {/* Modo tabela */}
        {!isLoadingAll && orders.length > 0 && viewMode === 'table' && (
            <Card className="border-glow bg-card">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30 hover:bg-transparent">
                      <TableHead className="text-xs text-muted-foreground">Cliente</TableHead>
                      <TableHead className="text-xs text-muted-foreground">Empresa</TableHead>
                      <TableHead className="text-xs text-muted-foreground">Itens</TableHead>
                      <TableHead className="text-xs text-muted-foreground">Valor</TableHead>
                      <TableHead className="text-xs text-muted-foreground">Status</TableHead>
                      <TableHead className="text-xs text-muted-foreground">Data</TableHead>
                      <TableHead className="text-xs text-muted-foreground w-32">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map(order => (
                        <TableRow key={order.id} className="border-border/20 hover:bg-primary/5 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <AvatarInitials name={order.clienteNome || 'C'} size="sm" />
                              <span className="text-sm font-medium">{order.clienteNome || order.customerId}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {order.empresaNome || order.companyId}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{order.items.length}</TableCell>
                          <TableCell className="text-sm font-medium">
                            R$ {Number(order.valorTotal).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline"
                                   className={`${statusConfig[order.status].class} text-[10px] font-semibold`}>
                              {statusConfig[order.status].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString('pt-BR') : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 items-center">
                              {/* Botões de transição inline */}
                              {TRANSICOES_VALIDAS[order.status].slice(0, 2).map(novoStatus => (
                                  <Button key={novoStatus} variant="ghost" size="icon"
                                          className={`h-7 w-7 ${ACAO_CLASS[novoStatus] ?? ''}`}
                                          title={ACAO_LABEL[novoStatus]}
                                          disabled={updateStatus.isPending}
                                          onClick={() => handleTransicao(order, novoStatus)}
                                  >
                            <span className="text-[9px] font-bold">
                              {ACAO_LABEL[novoStatus]?.charAt(0)}
                            </span>
                                  </Button>
                              ))}
                              {/* Editar com tooltip quando bloqueado */}
                              <BotaoEditar order={order} variant="icon" />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="border-glow bg-card">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir pedido?</AlertDialogTitle>
                                    <AlertDialogDescription>Não pode ser desfeito.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => remove.mutate(order.id)}
                                                       className="bg-destructive text-white">
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
        )}

        {/* Modal — criar / editar pedido */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="border-glow bg-card">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Pedido' : 'Novo Pedido'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select value={form.customerId}
                          onValueChange={v => setForm(f => ({ ...f, customerId: v }))}>
                    <SelectTrigger className="bg-muted border-border/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Empresa *</Label>
                  <Select value={form.companyId}
                          onValueChange={v => setForm(f => ({ ...f, companyId: v }))}>
                    <SelectTrigger className="bg-muted border-border/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Produto *</Label>
                  <Select value={form.productId}
                          onValueChange={v => setForm(f => ({ ...f, productId: v }))}>
                    <SelectTrigger className="bg-muted border-border/50">
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantidade *</Label>
                  <Input type="number" step="0.0001" min="0.0001"
                         value={form.quantidade}
                         onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))}
                         required className="bg-muted border-border/50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={form.descricao}
                          onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                          className="bg-muted border-border/50" rows={3} />
              </div>
              <Button type="submit"
                      className="w-full gradient-primary border-0 text-white"
                      disabled={isPending || !form.customerId || !form.companyId || !form.productId}>
                {isPending ? 'Salvando...' : editing ? 'Salvar' : 'Criar Pedido'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal — motivo de cancelamento (obrigatório para pedidos APROVADOS) */}
        <Dialog open={cancelacao.open}
                onOpenChange={o => setCancelacao(s => ({ ...s, open: o }))}>
          <DialogContent className="border-glow bg-card">
            <DialogHeader>
              <DialogTitle>Cancelar pedido</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Este pedido está <strong>Aprovado</strong>. Para cancelá-lo é necessário
                informar o motivo.
              </p>
              <div className="space-y-2">
                <Label>Motivo do cancelamento *</Label>
                <Textarea
                    value={cancelacao.motivo}
                    onChange={e => setCancelacao(s => ({ ...s, motivo: e.target.value }))}
                    placeholder="Descreva o motivo do cancelamento..."
                    className="bg-muted border-border/50"
                    rows={4}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline"
                        onClick={() => setCancelacao({ open: false, orderId: null, motivo: '' })}>
                  Voltar
                </Button>
                <Button
                    className="bg-destructive text-white hover:bg-destructive/90"
                    disabled={!cancelacao.motivo.trim() || updateStatus.isPending}
                    onClick={handleConfirmarCancelamento}
                >
                  {updateStatus.isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
  );
}