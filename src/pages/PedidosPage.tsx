import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrdersByOrg, getCustomersByOrg, getCompaniesByOrg, getUsersByOrg, createOrder, updateOrder, patchOrderStatus, deleteOrder } from '@/api/api';
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
import { Plus, Pencil, Trash2, LayoutGrid, List, Package, GripVertical } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { AvatarInitials } from '@/components/AvatarInitials';
import { motion } from 'framer-motion';
import type { Order, OrderStatus } from '@/types';

const statusConfig: Record<OrderStatus, { label: string; class: string; color: string }> = {
  ORCAMENTO: { label: 'Orçamento', class: 'status-orcamento', color: 'hsl(38 92% 50%)' },
  FECHADO: { label: 'Fechado', class: 'status-fechado', color: 'hsl(160 84% 39%)' },
  CANCELADO: { label: 'Cancelado', class: 'status-cancelado', color: 'hsl(0 84% 60%)' },
};

export default function PedidosPage() {
  const { user, organization } = useAuth();
  const orgId = organization?.id || '';
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [form, setForm] = useState({ clienteId: '', empresaId: '', vendedorId: '', valorTotal: '', status: 'ORCAMENTO' as OrderStatus, descricao: '' });

  const { data: orders = [] } = useQuery({ queryKey: ['orders', orgId], queryFn: () => getOrdersByOrg(orgId), enabled: !!orgId });
  const { data: customers = [] } = useQuery({ queryKey: ['customers', orgId], queryFn: () => getCustomersByOrg(orgId), enabled: !!orgId });
  const { data: companies = [] } = useQuery({ queryKey: ['companies', orgId], queryFn: () => getCompaniesByOrg(orgId), enabled: !!orgId });
  const { data: users = [] } = useQuery({ queryKey: ['users', orgId], queryFn: () => getUsersByOrg(orgId), enabled: !!orgId });

  const createMut = useMutation({ mutationFn: (d: Partial<Order>) => createOrder(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); setOpen(false); } });
  const updateMut = useMutation({ mutationFn: ({ id, d }: { id: string; d: Partial<Order> }) => updateOrder(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); setOpen(false); } });
  const statusMut = useMutation({ mutationFn: ({ id, s }: { id: string; s: OrderStatus }) => patchOrderStatus(id, s), onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }) });
  const deleteMut = useMutation({ mutationFn: (id: string) => deleteOrder(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }) });

  const openNew = (status?: OrderStatus) => {
    setEditing(null);
    setForm({ clienteId: '', empresaId: '', vendedorId: user?.id || '', valorTotal: '', status: status || 'ORCAMENTO', descricao: '' });
    setOpen(true);
  };
  const openEdit = (o: Order) => {
    setEditing(o);
    setForm({ clienteId: o.clienteId, empresaId: o.empresaId, vendedorId: o.vendedorId, valorTotal: String(o.valorTotal), status: o.status, descricao: o.descricao || '' });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, valorTotal: parseFloat(form.valorTotal) || 0, organizationId: orgId };
    if (editing) updateMut.mutate({ id: editing.id, d: payload });
    else createMut.mutate(payload);
  };

  const columns: OrderStatus[] = ['ORCAMENTO', 'FECHADO', 'CANCELADO'];

  return (
    <div className="space-y-6">
      <PageHeader title="Pedidos" subtitle="Gerencie seus pedidos e orçamentos">
        <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
          <Button variant={viewMode === 'kanban' ? 'default' : 'ghost'} size="icon" className={`h-8 w-8 ${viewMode === 'kanban' ? 'gradient-primary border-0' : ''}`} onClick={() => setViewMode('kanban')}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="icon" className={`h-8 w-8 ${viewMode === 'table' ? 'gradient-primary border-0' : ''}`} onClick={() => setViewMode('table')}>
            <List className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={() => openNew()} className="gradient-primary border-0 text-white shadow-lg shadow-primary/25">
          <Plus className="h-4 w-4 mr-2" />Novo Pedido
        </Button>
      </PageHeader>

      {orders.length === 0 ? (
        <EmptyState icon={Package} title="Nenhum pedido encontrado" description="Crie seu primeiro pedido para começar a gerenciar suas vendas." actionLabel="Novo Pedido" onAction={() => openNew()} />
      ) : viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map(col => {
            const colOrders = orders.filter(o => o.status === col);
            const cfg = statusConfig[col];
            return (
              <div key={col} className="flex flex-col">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: cfg.color }} />
                    <span className="text-sm font-semibold">{cfg.label}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{colOrders.length}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openNew(col)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-2 flex-1">
                  {colOrders.map(order => (
                    <motion.div key={order.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <Card className="border-glow glow-card bg-card cursor-pointer group" onClick={() => openEdit(order)}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <AvatarInitials name={order.clienteNome || 'C'} size="sm" />
                              <div>
                                <p className="text-sm font-medium">{order.clienteNome || order.clienteId}</p>
                                <p className="text-[10px] text-muted-foreground">{order.empresaNome || order.empresaId}</p>
                              </div>
                            </div>
                            <GripVertical className="h-4 w-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-lg font-bold letter-tight">R$ {order.valorTotal.toFixed(2)}</span>
                            <span className="text-[10px] text-muted-foreground">{order.createdAt ? new Date(order.createdAt).toLocaleDateString('pt-BR') : ''}</span>
                          </div>
                          {col === 'ORCAMENTO' && (
                            <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button size="sm" variant="ghost" className="h-6 text-[10px] text-status-success" onClick={e => { e.stopPropagation(); statusMut.mutate({ id: order.id, s: 'FECHADO' }); }}>Fechar</Button>
                              <Button size="sm" variant="ghost" className="h-6 text-[10px] text-status-danger" onClick={e => { e.stopPropagation(); statusMut.mutate({ id: order.id, s: 'CANCELADO' }); }}>Cancelar</Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="border-glow bg-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/30 hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground">Cliente</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Empresa</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Valor</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Data</TableHead>
                  <TableHead className="text-xs text-muted-foreground w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map(order => (
                  <TableRow key={order.id} className="border-border/20 hover:bg-primary/5 transition-colors">
                    <TableCell><div className="flex items-center gap-2"><AvatarInitials name={order.clienteNome || 'C'} size="sm" /><span className="text-sm font-medium">{order.clienteNome || order.clienteId}</span></div></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{order.empresaNome || order.empresaId}</TableCell>
                    <TableCell className="text-sm font-medium">R$ {order.valorTotal.toFixed(2)}</TableCell>
                    <TableCell><Badge variant="outline" className={`${statusConfig[order.status].class} text-[10px] font-semibold`}>{statusConfig[order.status].label}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{order.createdAt ? new Date(order.createdAt).toLocaleDateString('pt-BR') : '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(order)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                          <AlertDialogContent className="border-glow bg-card"><AlertDialogHeader><AlertDialogTitle>Excluir pedido?</AlertDialogTitle><AlertDialogDescription>Não pode ser desfeito.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteMut.mutate(order.id)} className="bg-destructive text-white">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-glow bg-card">
          <DialogHeader><DialogTitle>{editing ? 'Editar Pedido' : 'Novo Pedido'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select value={form.clienteId} onValueChange={v => setForm(f => ({ ...f, clienteId: v }))}>
                  <SelectTrigger className="bg-muted border-border/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Empresa *</Label>
                <Select value={form.empresaId} onValueChange={v => setForm(f => ({ ...f, empresaId: v }))}>
                  <SelectTrigger className="bg-muted border-border/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vendedor *</Label>
                <Select value={form.vendedorId} onValueChange={v => setForm(f => ({ ...f, vendedorId: v }))}>
                  <SelectTrigger className="bg-muted border-border/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Valor Total *</Label><Input type="number" step="0.01" value={form.valorTotal} onChange={e => setForm(f => ({ ...f, valorTotal: e.target.value }))} required className="bg-muted border-border/50" /></div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as OrderStatus }))}>
                <SelectTrigger className="bg-muted border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ORCAMENTO">Orçamento</SelectItem>
                  <SelectItem value="FECHADO">Fechado</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} className="bg-muted border-border/50" rows={3} /></div>
            <Button type="submit" className="w-full gradient-primary border-0 text-white">{editing ? 'Salvar' : 'Criar Pedido'}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
