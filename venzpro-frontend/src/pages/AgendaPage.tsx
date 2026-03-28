import { useState } from 'react';
import { useEvents } from '@/hooks/useEvents';
import { useCustomers } from '@/hooks/useCustomers';
import { useCompanies } from '@/hooks/useCompanies';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Pencil, Trash2, Calendar, List, MapPin, Users2, RefreshCw, X, Loader2, Link2, Link2Off } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { motion } from 'framer-motion';
import type { Event as AppEvent, EventType, EventStatus } from '@/types';

const typeConfig: Record<EventType, { label: string; color: string }> = {
  VISITA:    { label: 'Visita',    color: 'hsl(239 84% 67%)' },
  REUNIAO:   { label: 'Reunião',   color: 'hsl(188 95% 43%)' },
  FOLLOW_UP: { label: 'Follow-up', color: 'hsl(38 92% 50%)' },
};
const statusConfig: Record<EventStatus, { label: string; class: string }> = {
  AGENDADO:  { label: 'Agendado',  class: 'status-agendado' },
  CONCLUIDO: { label: 'Concluído', class: 'status-concluido' },
  CANCELADO: { label: 'Cancelado', class: 'status-cancelado' },
};

function groupByDate(events: AppEvent[]) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const endOfWeek = new Date(today); endOfWeek.setDate(endOfWeek.getDate() + 7);

  const groups: { label: string; events: AppEvent[] }[] = [
    { label: 'Atrasados / Histórico', events: [] },
    { label: 'Hoje', events: [] },
    { label: 'Amanhã', events: [] },
    { label: 'Esta Semana', events: [] },
    { label: 'Futuro', events: [] },
  ];

  [...events].sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime()).forEach(ev => {
    const d = new Date(ev.dataInicio); d.setHours(0, 0, 0, 0);

    if      (d.getTime() < today.getTime())      groups[0].events.push(ev);
    else if (d.getTime() === today.getTime())    groups[1].events.push(ev);
    else if (d.getTime() === tomorrow.getTime()) groups[2].events.push(ev);
    else if (d < endOfWeek)                      groups[3].events.push(ev);
    else                                         groups[4].events.push(ev);
  });

  return groups.filter(g => g.events.length > 0);
}

type Form = {
  titulo: string; tipo: EventType; status: EventStatus;
  dataInicio: string; dataFim: string;
  customerId: string; companyId: string; descricao: string;
  participantes: string[];
};

const emptyForm: Form = {
  titulo: '', tipo: 'VISITA', status: 'AGENDADO',
  dataInicio: '', dataFim: '', customerId: '', companyId: '',
  descricao: '', participantes: [],
};

export default function AgendaPage() {
  const { events, isLoading, create, update, remove } = useEvents();
  const { customers } = useCustomers();
  const { companies } = useCompanies();

  const safeCustomers = Array.isArray(customers) ? customers : (customers?.content || []);
  const safeCompanies = Array.isArray(companies) ? companies : (companies?.content || []);

  // Google Calendar
  const { isConnected, isSyncing, connect, disconnect, sync, pushEvent } = useGoogleCalendar();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleGoogleConnect = async () => {
    setIsConnecting(true);
    try {
      await connect();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao conectar';
      if (!msg.includes('fechada')) {
        import('@/lib/toast').then(({ notify }) => notify.error(msg));
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handlePushToGoogle = async (ev: AppEvent) => {
    if (!isConnected) {
      await handleGoogleConnect();
    }
    await pushEvent(ev);
  };

  const [open,       setOpen]   = useState(false);
  const [editing,    setEditing] = useState<AppEvent | null>(null);
  const [viewMode,   setViewMode] = useState<'timeline' | 'calendar'>('timeline');
  const [form,       setForm]   = useState<Form>(emptyForm);
  const [emailInput, setEmailInput] = useState('');

  // ── FUNÇÃO PARA PEGAR A DATA/HORA ATUAL (FORMATO YYYY-MM-DDTHH:mm) ──
  const getCurrentLocalDateTime = () => {
    const now = new Date();
    // Ajusta o fuso horário para bater com o input local
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  const minDateTime = getCurrentLocalDateTime();

  // Verifica se o evento que estamos editando ocorreu no passado
  const isPastEvent = editing ? new Date(editing.dataInicio) < new Date() : false;

  const openNew  = () => { setEditing(null); setForm(emptyForm); setEmailInput(''); setOpen(true); };
  const openEdit = (ev: AppEvent) => {
    setEditing(ev);
    setForm({
      titulo: ev.titulo, tipo: ev.tipo, status: ev.status,
      dataInicio: ev.dataInicio?.slice(0, 16) ?? '',
      dataFim:    ev.dataFim?.slice(0, 16)    ?? '',
      customerId: ev.customerId ?? '', companyId: ev.companyId ?? '',
      descricao:  ev.descricao  ?? '',
      participantes: ev.participantes ?? [],
    });
    setEmailInput('');
    setOpen(true);
  };

  const addParticipant = () => {
    if (isPastEvent) return; // Bloqueia adição em eventos passados
    const email = emailInput.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (form.participantes.includes(email)) return;
    setForm(f => ({ ...f, participantes: [...f.participantes, email] }));
    setEmailInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações de Segurança das Datas
    if (!isPastEvent && new Date(form.dataInicio) < new Date()) {
      import('@/lib/toast').then(({ notify }) => notify.error("Não é possível agendar eventos no passado."));
      return;
    }
    if (form.dataFim && new Date(form.dataFim) < new Date(form.dataInicio)) {
      import('@/lib/toast').then(({ notify }) => notify.error("A data de fim não pode ser anterior à data de início."));
      return;
    }

    const payload = {
      titulo:     form.titulo, tipo: form.tipo, status: form.status,
      dataInicio: form.dataInicio,
      dataFim:    form.dataFim  || undefined,
      customerId: form.customerId || undefined,
      companyId:  form.companyId  || undefined,
      descricao:  form.descricao  || undefined,
      participantes: form.participantes,
    };
    if (editing) await update.mutateAsync({ id: editing.id, ...payload });
    else         await create.mutateAsync(payload);
    setOpen(false);
  };

  const isPending = create.isPending || update.isPending;
  const groups    = groupByDate(events);

  // Calendário
  const now = new Date();
  const year = now.getFullYear(); const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const eventsByDay: Record<number, AppEvent[]> = {};
  events.forEach(ev => {
    const d = new Date(ev.dataInicio);
    if (d.getMonth() === month && d.getFullYear() === year) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(ev);
    }
  });

  return (
      <div className="space-y-6">
        <PageHeader title="Agenda" subtitle="Gerencie seus compromissos e visitas">
          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
            <Button variant={viewMode === 'timeline' ? 'default' : 'ghost'} size="icon"
                    className={`h-8 w-8 ${viewMode === 'timeline' ? 'gradient-primary border-0' : ''}`}
                    onClick={() => setViewMode('timeline')}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === 'calendar' ? 'default' : 'ghost'} size="icon"
                    className={`h-8 w-8 ${viewMode === 'calendar' ? 'gradient-primary border-0' : ''}`}
                    onClick={() => setViewMode('calendar')}><Calendar className="h-4 w-4" /></Button>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              {isConnected ? (
                  <div className="flex items-center gap-1.5">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={sync}
                        disabled={isSyncing}
                        className="h-9 border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 gap-2"
                    >
                      {isSyncing
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <RefreshCw className="h-3.5 w-3.5" />
                      }
                      {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={disconnect}>
                      <Link2Off className="h-3.5 w-3.5" />
                    </Button>
                  </div>
              ) : (
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGoogleConnect}
                      disabled={isConnecting}
                      className="h-9 border-border/50 gap-2"
                  >
                    {isConnecting
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Link2 className="h-3.5 w-3.5" />
                    }
                    {isConnecting ? 'Conectando...' : 'Google Calendar'}
                  </Button>
              )}
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[240px] text-xs">
              {isConnected
                  ? 'Importar eventos do Google Calendar para o VenzPro'
                  : 'Conectar Google Calendar para importar e exportar eventos'
              }
            </TooltipContent>
          </Tooltip>

          <Button onClick={openNew} className="gradient-primary border-0 text-white shadow-lg shadow-primary/25">
            <Plus className="h-4 w-4 mr-2" />Novo Evento
          </Button>
        </PageHeader>

        {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="border-glow bg-card"><CardContent className="p-4 flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-1/3" /></div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </CardContent></Card>
              ))}
            </div>
        )}

        {!isLoading && events.length === 0 && (
            <EmptyState icon={Calendar} title="Nenhum evento agendado"
                        description="Agende visitas, reuniões e follow-ups para manter o controle."
                        actionLabel="Novo Evento" onAction={openNew} />
        )}

        {!isLoading && events.length > 0 && viewMode === 'timeline' && (
            <div className="space-y-6">
              {groups.map((group, gi) => (
                  <div key={gi}>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{group.label}</h3>
                    <div className="space-y-2">
                      {group.events.map(ev => {
                        const tc = typeConfig[ev.tipo];
                        const sc = statusConfig[ev.status];
                        return (
                            <motion.div key={ev.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
                              <Card className="border-glow glow-card bg-card group" onClick={() => openEdit(ev)}>
                                <CardContent className="p-4 flex items-center gap-4 cursor-pointer">
                                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                                       style={{ background: `${tc.color.replace(')', ' / 0.15)')}` }}>
                                    {ev.tipo === 'VISITA'    ? <MapPin    className="h-4 w-4" style={{ color: tc.color }} /> :
                                        ev.tipo === 'REUNIAO'   ? <Users2    className="h-4 w-4" style={{ color: tc.color }} /> :
                                            <RefreshCw className="h-4 w-4" style={{ color: tc.color }} />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">{ev.titulo}</span>
                                      <Badge variant="outline" className="text-[10px]"
                                             style={{ color: tc.color, borderColor: `${tc.color.replace(')', ' / 0.3)')}` }}>
                                        {tc.label}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {new Date(ev.dataInicio).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                                      {ev.clienteNome && <span className="text-xs text-muted-foreground">• {ev.clienteNome}</span>}
                                      {ev.participantes && ev.participantes.length > 0 && (
                                          <span className="text-xs text-muted-foreground">• {ev.participantes.length} participante{ev.participantes.length > 1 ? 's' : ''}</span>
                                      )}
                                    </div>
                                  </div>
                                  <Badge variant="outline" className={`${sc.class} text-[10px] font-semibold`}>{sc.label}</Badge>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {isConnected && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-[hsl(217,91%,60%)]"
                                                title="Exportar para Google Calendar"
                                                onClick={e => { e.stopPropagation(); handlePushToGoogle(ev); }}>
                                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                                          </svg>
                                        </Button>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-8 w-8"
                                            onClick={e => { e.stopPropagation(); openEdit(ev); }}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                                                onClick={e => e.stopPropagation()}>
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="border-glow bg-card">
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
                                          <AlertDialogDescription>Não pode ser desfeito.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => remove.mutate(ev.id)} className="bg-destructive text-white">Excluir</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                        );
                      })}
                    </div>
                  </div>
              ))}
            </div>
        )}

        {!isLoading && events.length > 0 && viewMode === 'calendar' && (
            <Card className="border-glow bg-card">
              <CardContent className="p-5">
                <h3 className="text-lg font-semibold mb-4 capitalize">{monthName}</h3>
                <div className="grid grid-cols-7 gap-1">
                  {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
                      <div key={d} className="text-[10px] text-muted-foreground text-center font-medium py-2">{d}</div>
                  ))}
                  {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dayEvents = eventsByDay[day] ?? [];
                    const isToday = day === now.getDate();
                    return (
                        <div key={day}
                             className={`relative p-1.5 rounded-lg min-h-[60px] text-xs transition-colors hover:bg-muted/30 cursor-pointer ${isToday ? 'bg-primary/10 ring-1 ring-primary/30' : ''}`}
                             onClick={openNew}>
                          <span className={isToday ? 'text-primary font-bold' : 'text-muted-foreground'}>{day}</span>
                          <div className="mt-1 space-y-0.5">
                            {dayEvents.slice(0, 2).map(ev => (
                                <div key={ev.id} className="h-1.5 rounded-full" style={{ background: typeConfig[ev.tipo].color }} />
                            ))}
                            {dayEvents.length > 2 && <span className="text-[8px] text-muted-foreground">+{dayEvents.length - 2}</span>}
                          </div>
                        </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="border-glow bg-card max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editing ? (isPastEvent ? 'Detalhes do Evento' : 'Editar Evento') : 'Novo Evento'}
              </DialogTitle>
              {isPastEvent && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Este evento já ocorreu. Você pode apenas atualizar a observação e alterar o status.
                  </p>
              )}
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">

              <div className="space-y-2">
                <Label>Título *</Label>
                <Input value={form.titulo} disabled={isPastEvent} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} required className="bg-muted border-border/50 disabled:opacity-75" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select disabled={isPastEvent} value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v as EventType }))}>
                    <SelectTrigger className="bg-muted border-border/50 disabled:opacity-75"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VISITA">Visita</SelectItem>
                      <SelectItem value="REUNIAO">Reunião</SelectItem>
                      <SelectItem value="FOLLOW_UP">Follow-up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status *</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as EventStatus }))}>
                    <SelectTrigger className="bg-muted border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AGENDADO">Agendado</SelectItem>
                      <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                      <SelectItem value="CANCELADO">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Início *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        type="datetime-local"
                        value={form.dataInicio}
                        disabled={isPastEvent}
                        min={!isPastEvent ? minDateTime : undefined}
                        onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))}
                        required
                        className="pl-9 bg-muted border-border/50 disabled:opacity-75"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        type="datetime-local"
                        value={form.dataFim}
                        disabled={isPastEvent}
                        min={form.dataInicio || (!isPastEvent ? minDateTime : undefined)}
                        onChange={e => setForm(f => ({ ...f, dataFim: e.target.value }))}
                        className="pl-9 bg-muted border-border/50 disabled:opacity-75"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select disabled={isPastEvent} value={form.customerId || '__none__'} onValueChange={v => setForm(f => ({ ...f, customerId: v === '__none__' ? '' : v }))}>
                    <SelectTrigger className="bg-muted border-border/50 disabled:opacity-75"><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {safeCustomers.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Empresa</Label>
                  <Select disabled={isPastEvent} value={form.companyId || '__none__'} onValueChange={v => setForm(f => ({ ...f, companyId: v === '__none__' ? '' : v }))}>
                    <SelectTrigger className="bg-muted border-border/50 disabled:opacity-75"><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhuma</SelectItem>
                      {safeCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Participantes</Label>
                <div className="flex gap-2">
                  <Input value={emailInput} disabled={isPastEvent} onChange={e => setEmailInput(e.target.value)}
                         onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addParticipant(); } }}
                         placeholder={isPastEvent ? 'Bloqueado' : 'email@exemplo.com'} className="bg-muted border-border/50 flex-1 disabled:opacity-75" />
                  <Button type="button" variant="outline" disabled={isPastEvent} onClick={addParticipant} className="shrink-0">Adicionar</Button>
                </div>
                {form.participantes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.participantes.map(email => (
                          <span key={email} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${isPastEvent ? 'bg-muted text-muted-foreground border-border/50' : 'bg-primary/10 text-primary border-primary/20'}`}>
                      {email}
                            {!isPastEvent && (
                                <button type="button"
                                        onClick={() => setForm(f => ({ ...f, participantes: f.participantes.filter(e => e !== email) }))}
                                        className="hover:text-destructive transition-colors">
                                  <X className="h-3 w-3" />
                                </button>
                            )}
                    </span>
                      ))}
                    </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Observação (Descrição)</Label>
                <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder={isPastEvent ? "Adicione os detalhes de como foi a reunião..." : ""} className="bg-muted border-border/50" rows={3} />
              </div>

              <Button type="submit" className="w-full gradient-primary border-0 text-white" disabled={isPending}>
                {isPending ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Criar Evento'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
  );
}