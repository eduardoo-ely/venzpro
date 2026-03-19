import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEventsByOrg, createEvent, updateEvent, deleteEvent, getCustomersByOrg, getCompaniesByOrg } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Event as EventModel, EventType, EventStatus } from '@/types';

const TIPO_OPTIONS: EventType[] = ['VISITA', 'REUNIAO', 'FOLLOW_UP'];
const STATUS_OPTIONS: EventStatus[] = ['AGENDADO', 'CONCLUIDO', 'CANCELADO'];

export default function AgendaPage() {
  const { organization } = useAuth();
  const orgId = organization?.id || '';
  const qc = useQueryClient();
  const [tipoFilter, setTipoFilter] = useState<string>('TODOS');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EventModel | null>(null);
  const [form, setForm] = useState({ titulo: '', tipo: 'VISITA' as EventType, clienteId: '', empresaId: '', dataInicio: '', dataFim: '', descricao: '', status: 'AGENDADO' as EventStatus });

  const { data: events = [] } = useQuery({ queryKey: ['events', orgId], queryFn: () => getEventsByOrg(orgId), enabled: !!orgId });
  const { data: customers = [] } = useQuery({ queryKey: ['customers', orgId], queryFn: () => getCustomersByOrg(orgId), enabled: !!orgId });
  const { data: companies = [] } = useQuery({ queryKey: ['companies', orgId], queryFn: () => getCompaniesByOrg(orgId), enabled: !!orgId });

  const createMut = useMutation({ mutationFn: (d: Partial<EventModel>) => createEvent(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); setOpen(false); } });
  const updateMut = useMutation({ mutationFn: ({ id, d }: { id: string; d: Partial<EventModel> }) => updateEvent(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); setOpen(false); } });
  const deleteMut = useMutation({ mutationFn: (id: string) => deleteEvent(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }) });

  const filtered = events
    .filter(e => tipoFilter === 'TODOS' || e.tipo === tipoFilter)
    .filter(e => statusFilter === 'TODOS' || e.status === statusFilter);

  const openNew = () => { setEditing(null); setForm({ titulo: '', tipo: 'VISITA', clienteId: '', empresaId: '', dataInicio: '', dataFim: '', descricao: '', status: 'AGENDADO' }); setOpen(true); };
  const openEdit = (ev: EventModel) => { setEditing(ev); setForm({ titulo: ev.titulo, tipo: ev.tipo, clienteId: ev.clienteId || '', empresaId: ev.empresaId || '', dataInicio: ev.dataInicio, dataFim: ev.dataFim || '', descricao: ev.descricao || '', status: ev.status }); setOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const d = { ...form, organizationId: orgId, clienteId: form.clienteId || undefined, empresaId: form.empresaId || undefined, dataFim: form.dataFim || undefined };
    if (editing) updateMut.mutate({ id: editing.id, d });
    else createMut.mutate(d);
  };

  const statusClass = (s: string) => s === 'AGENDADO' ? 'status-agendado' : s === 'CONCLUIDO' ? 'status-concluido' : 'status-cancelado';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-muted-foreground">Gerencie visitas, reuniões e follow-ups</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Evento</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? 'Editar Evento' : 'Novo Evento'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Título *</Label><Input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v as EventType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPO_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status *</Label>
                  <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as EventStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={form.clienteId} onValueChange={v => setForm(p => ({ ...p, clienteId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select value={form.empresaId} onValueChange={v => setForm(p => ({ ...p, empresaId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Data Início *</Label><Input type="datetime-local" value={form.dataInicio} onChange={e => setForm(p => ({ ...p, dataInicio: e.target.value }))} required /></div>
                <div className="space-y-2"><Label>Data Fim</Label><Input type="datetime-local" value={form.dataFim} onChange={e => setForm(p => ({ ...p, dataFim: e.target.value }))} /></div>
              </div>
              <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} /></div>
              <Button type="submit" className="w-full">{editing ? 'Salvar' : 'Criar'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos os tipos</SelectItem>
            {TIPO_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos status</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Data Início</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum evento encontrado</TableCell></TableRow>
            ) : filtered.map(ev => (
              <TableRow key={ev.id}>
                <TableCell className="font-medium">{ev.titulo}</TableCell>
                <TableCell><Badge variant="secondary">{ev.tipo}</Badge></TableCell>
                <TableCell>{ev.clienteNome || ev.clienteId || '-'}</TableCell>
                <TableCell className="text-sm">{new Date(ev.dataInicio).toLocaleString('pt-BR')}</TableCell>
                <TableCell><Badge variant="outline" className={statusClass(ev.status)}>{ev.status}</Badge></TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(ev)}><Pencil className="h-4 w-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Excluir evento?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteMut.mutate(ev.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
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
