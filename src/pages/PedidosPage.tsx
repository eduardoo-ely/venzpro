import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrdersByOrg, createOrder, updateOrder, patchOrderStatus, deleteOrder, getCustomersByOrg, getCompaniesByOrg, getUsersByOrg } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Order, OrderStatus } from '@/types';

const STATUS_OPTIONS: OrderStatus[] = ['ORCAMENTO', 'FECHADO', 'CANCELADO'];

export default function PedidosPage() {
  const { organization, user } = useAuth();
  const orgId = organization?.id || '';
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [form, setForm] = useState({ clienteId: '', empresaId: '', vendedorId: '', valorTotal: '', status: 'ORCAMENTO' as OrderStatus, descricao: '' });

  const { data: orders = [] } = useQuery({ queryKey: ['orders', orgId], queryFn: () => getOrdersByOrg(orgId), enabled: !!orgId });
  const { data: customers = [] } = useQuery({ queryKey: ['customers', orgId], queryFn: () => getCustomersByOrg(orgId), enabled: !!orgId });
  const { data: companies = [] } = useQuery({ queryKey: ['companies', orgId], queryFn: () => getCompaniesByOrg(orgId), enabled: !!orgId });
  const { data: users = [] } = useQuery({ queryKey: ['users', orgId], queryFn: () => getUsersByOrg(orgId), enabled: !!orgId });

  const createMut = useMutation({ mutationFn: (d: Partial<Order>) => createOrder(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); setOpen(false); } });
  const updateMut = useMutation({ mutationFn: ({ id, d }: { id: string; d: Partial<Order> }) => updateOrder(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); setOpen(false); } });
  const statusMut = useMutation({ mutationFn: ({ id, s }: { id: string; s: OrderStatus }) => patchOrderStatus(id, s), onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }) });
  const deleteMut = useMutation({ mutationFn: (id: string) => deleteOrder(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }) });

  const filtered = statusFilter === 'TODOS' ? orders : orders.filter(o => o.status === statusFilter);

  const openNew = () => { setEditing(null); setForm({ clienteId: '', empresaId: '', vendedorId: user?.id || '', valorTotal: '', status: 'ORCAMENTO', descricao: '' }); setOpen(true); };
  const openEdit = (o: Order) => { setEditing(o); setForm({ clienteId: o.clienteId, empresaId: o.empresaId, vendedorId: o.vendedorId, valorTotal: String(o.valorTotal), status: o.status, descricao: o.descricao || '' }); setOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const d = { ...form, valorTotal: parseFloat(form.valorTotal) || 0, organizationId: orgId };
    if (editing) updateMut.mutate({ id: editing.id, d });
    else createMut.mutate(d);
  };

  const statusClass = (s: string) => s === 'ORCAMENTO' ? 'status-orcamento' : s === 'FECHADO' ? 'status-fechado' : 'status-cancelado';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground">Gerencie seus pedidos e orçamentos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Pedido</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? 'Editar Pedido' : 'Novo Pedido'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select value={form.clienteId} onValueChange={v => setForm(p => ({ ...p, clienteId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Empresa *</Label>
                <Select value={form.empresaId} onValueChange={v => setForm(p => ({ ...p, empresaId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vendedor *</Label>
                <Select value={form.vendedorId} onValueChange={v => setForm(p => ({ ...p, vendedorId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Valor Total</Label><Input type="number" step="0.01" value={form.valorTotal} onChange={e => setForm(p => ({ ...p, valorTotal: e.target.value }))} /></div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as OrderStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} /></div>
              <Button type="submit" className="w-full">{editing ? 'Salvar' : 'Criar'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="TODOS">Todos</TabsTrigger>
          <TabsTrigger value="ORCAMENTO">Orçamento</TabsTrigger>
          <TabsTrigger value="FECHADO">Fechado</TabsTrigger>
          <TabsTrigger value="CANCELADO">Cancelado</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum pedido encontrado</TableCell></TableRow>
            ) : filtered.map(o => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.clienteNome || o.clienteId}</TableCell>
                <TableCell>{o.empresaNome || o.empresaId}</TableCell>
                <TableCell>R$ {o.valorTotal.toFixed(2)}</TableCell>
                <TableCell>
                  <Select value={o.status} onValueChange={s => statusMut.mutate({ id: o.id, s: s as OrderStatus })}>
                    <SelectTrigger className="w-[130px] h-8"><Badge variant="outline" className={statusClass(o.status)}>{o.status}</Badge></SelectTrigger>
                    <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{o.createdAt ? new Date(o.createdAt).toLocaleDateString('pt-BR') : '-'}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(o)}><Pencil className="h-4 w-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Excluir pedido?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteMut.mutate(o.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
