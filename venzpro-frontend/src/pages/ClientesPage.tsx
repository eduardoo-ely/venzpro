import { useState } from 'react';
import { useCustomers } from '@/hooks/useCustomers';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus, Pencil, Trash2, Search, LayoutGrid, List,
  Phone, Mail, MapPin, Users, CheckCircle, XCircle, Clock,
  UserCog, UserMinus,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { AvatarInitials } from '@/components/AvatarInitials';
import { motion } from 'framer-motion';
import type { Customer, CustomerStatus } from '@/types';

// ── Configuração visual dos status ────────────────────────────────────────────

const statusConfig: Record<CustomerStatus, { label: string; badgeClass: string; icon: React.ElementType }> = {
  PENDENTE:  { label: 'Pendente',  badgeClass: 'bg-[hsl(38_92%_50%/0.15)] text-[hsl(38,92%,50%)] border-[hsl(38_92%_50%/0.3)]',   icon: Clock       },
  APROVADO:  { label: 'Aprovado',  badgeClass: 'bg-[hsl(160_84%_39%/0.15)] text-[hsl(160,84%,39%)] border-[hsl(160_84%_39%/0.3)]', icon: CheckCircle },
  REJEITADO: { label: 'Rejeitado', badgeClass: 'bg-[hsl(0_84%_60%/0.15)] text-[hsl(0,84%,60%)] border-[hsl(0_84%_60%/0.3)]',       icon: XCircle     },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatarDocumento(doc?: string): string {
  if (!doc) return '';
  const d = doc.replace(/\D/g, '');
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return doc;
}

function normalizarDocumento(doc: string): string {
  return doc.replace(/\D/g, '');
}

// ── Tipos internos ────────────────────────────────────────────────────────────

type Form = { nome: string; telefone: string; email: string; cidade: string; cpfCnpj: string };
type RejeicaoState    = { open: boolean; customerId: string | null; motivo: string };
type AtribuicaoState  = { open: boolean; customer: Customer | null; ownerIdSelecionado: string };

const emptyForm: Form = { nome: '', telefone: '', email: '', cidade: '', cpfCnpj: '' };
const DESATRIBUIR     = '__desatribuir__';

// ── Componente principal ──────────────────────────────────────────────────────

export default function ClientesPage() {
  const { customers, isLoading, create, update, updateStatus, updateOwner, remove } = useCustomers();
  const { users }    = useUsers();
  const { user }     = useAuth();

  const [open,      setOpen]      = useState(false);
  const [editing,   setEditing]   = useState<Customer | null>(null);
  const [search,    setSearch]    = useState('');
  const [viewMode,  setViewMode]  = useState<'grid' | 'table'>('grid');
  const [form,      setForm]      = useState<Form>(emptyForm);
  const [rejeicao,  setRejeicao]  = useState<RejeicaoState>({ open: false, customerId: null, motivo: '' });
  const [atribuicao, setAtribuicao] = useState<AtribuicaoState>({ open: false, customer: null, ownerIdSelecionado: '' });

  // Apenas ADMIN e GERENTE veem controles de aprovação e atribuição de carteira
  const podeGerenciar = user?.role === 'ADMIN' || user?.role === 'GERENTE';

  // Usuários elegíveis para receber carteira: VENDEDOR e GERENTE (ADMIN não tem carteira)
  const usuariosElegiveis = users.filter(u => u.role === 'VENDEDOR' || u.role === 'GERENTE');

  const filtered = customers.filter(c =>
      c.nome.toLowerCase().includes(search.toLowerCase())       ||
      c.email?.toLowerCase().includes(search.toLowerCase())     ||
      c.cidade?.toLowerCase().includes(search.toLowerCase())    ||
      c.cpfCnpj?.includes(search.replace(/\D/g, ''))
  );

  // ── Handlers — formulário ────────────────────────────────────────────────────

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      nome:     c.nome,
      telefone: c.telefone ?? '',
      email:    c.email    ?? '',
      cidade:   c.cidade   ?? '',
      cpfCnpj:  c.cpfCnpj  ? formatarDocumento(c.cpfCnpj) : '',
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nome:     form.nome,
      telefone: form.telefone || undefined,
      email:    form.email    || undefined,
      cidade:   form.cidade   || undefined,
      cpfCnpj:  form.cpfCnpj  ? normalizarDocumento(form.cpfCnpj) : undefined,
    };
    if (editing) await update.mutateAsync({ id: editing.id, ...payload });
    else         await create.mutateAsync(payload);
    setOpen(false);
  };

  // ── Handlers — aprovação ─────────────────────────────────────────────────────

  const handleAprovar = (c: Customer) =>
      updateStatus.mutate({ id: c.id, status: 'APROVADO' });

  const handleRejeitar = () => {
    if (!rejeicao.customerId) return;
    updateStatus.mutate({ id: rejeicao.customerId, status: 'REJEITADO', motivo: rejeicao.motivo });
    setRejeicao({ open: false, customerId: null, motivo: '' });
  };

  // ── Handlers — atribuição de owner ───────────────────────────────────────────

  const abrirAtribuicao = (c: Customer) =>
      setAtribuicao({ open: true, customer: c, ownerIdSelecionado: c.ownerId ?? DESATRIBUIR });

  const handleConfirmarAtribuicao = () => {
    if (!atribuicao.customer) return;
    const ownerId = atribuicao.ownerIdSelecionado === DESATRIBUIR
        ? null
        : atribuicao.ownerIdSelecionado;
    updateOwner.mutate({ id: atribuicao.customer.id, ownerId });
    setAtribuicao({ open: false, customer: null, ownerIdSelecionado: '' });
  };

  const isPending = create.isPending || update.isPending;

  // ── Sub-componentes ───────────────────────────────────────────────────────────

  const StatusBadge = ({ status }: { status: CustomerStatus }) => {
    const cfg  = statusConfig[status];
    const Icon = cfg.icon;
    return (
        <Badge variant="outline" className={`${cfg.badgeClass} text-[10px] font-semibold flex items-center gap-1`}>
          <Icon className="h-3 w-3" />{cfg.label}
        </Badge>
    );
  };

  // Badge âmbar "Sem responsável" — visível apenas para ADMIN/GERENTE
  const OwnerBadge = ({ c }: { c: Customer }) => {
    if (!podeGerenciar) return null;
    if (c.ownerNome) {
      return (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
          <UserCog className="h-3 w-3" />{c.ownerNome}
        </span>
      );
    }
    return (
        <span className="text-[10px] flex items-center gap-1 mt-1 text-[hsl(38,92%,50%)]">
        <UserMinus className="h-3 w-3" />Sem responsável
      </span>
    );
  };

  // Botões de aprovação (card) — PENDENTE + ADMIN/GERENTE
  const BotoesAprovacao = ({ c }: { c: Customer }) => {
    if (!podeGerenciar || c.status !== 'PENDENTE') return null;
    return (
        <div className="flex gap-1 mt-2">
          <Button size="sm" variant="ghost"
                  className="h-7 text-[11px] text-[hsl(160,84%,39%)] hover:bg-[hsl(160_84%_39%/0.1)]"
                  disabled={updateStatus.isPending}
                  onClick={() => handleAprovar(c)}
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1" />Aprovar
          </Button>
          <Button size="sm" variant="ghost"
                  className="h-7 text-[11px] text-destructive hover:bg-destructive/10"
                  onClick={() => setRejeicao({ open: true, customerId: c.id, motivo: '' })}
          >
            <XCircle className="h-3.5 w-3.5 mr-1" />Rejeitar
          </Button>
        </div>
    );
  };

  // ── JSX principal ─────────────────────────────────────────────────────────────

  return (
      <div className="space-y-6">
        <PageHeader title="Clientes" subtitle="Gerencie sua base de clientes">
          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
            <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon"
                    className={`h-8 w-8 ${viewMode === 'grid' ? 'gradient-primary border-0' : ''}`}
                    onClick={() => setViewMode('grid')}><LayoutGrid className="h-4 w-4" /></Button>
            <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="icon"
                    className={`h-8 w-8 ${viewMode === 'table' ? 'gradient-primary border-0' : ''}`}
                    onClick={() => setViewMode('table')}><List className="h-4 w-4" /></Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, email, cidade ou CPF/CNPJ..."
                   value={search} onChange={e => setSearch(e.target.value)}
                   className="pl-9 w-72 bg-muted border-border/50" />
          </div>
          <Button onClick={openNew} className="gradient-primary border-0 text-white shadow-lg shadow-primary/25">
            <Plus className="h-4 w-4 mr-2" />Novo Cliente
          </Button>
        </PageHeader>

        {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i} className="border-glow bg-card">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-1 flex-1"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                      </div>
                      <Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" />
                    </CardContent>
                  </Card>
              ))}
            </div>
        )}

        {!isLoading && filtered.length === 0 && (
            <EmptyState icon={Users} title="Nenhum cliente encontrado"
                        description={search ? 'Tente outros termos de busca.' : 'Comece adicionando seu primeiro cliente.'}
                        actionLabel="Novo Cliente" onAction={openNew} />
        )}

        {/* Modo grid */}
        {!isLoading && filtered.length > 0 && viewMode === 'grid' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(c => (
                  <Card key={c.id} className="border-glow glow-card bg-card group">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <AvatarInitials name={c.nome} size="md" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{c.nome}</p>
                          {c.cidade && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3" />{c.cidade}
                              </p>
                          )}
                          <OwnerBadge c={c} />
                        </div>
                        <StatusBadge status={c.status} />
                      </div>

                      {c.cpfCnpj && (
                          <p className="text-xs text-muted-foreground mb-1 font-mono">
                            {formatarDocumento(c.cpfCnpj)}
                          </p>
                      )}
                      {c.telefone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-2 mb-1">
                            <Phone className="h-3 w-3" />{c.telefone}
                          </p>
                      )}
                      {c.email && (
                          <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <Mail className="h-3 w-3" />{c.email}
                          </p>
                      )}

                      <BotoesAprovacao c={c} />

                      <div className="flex gap-1 mt-4 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap">
                        {/* Botão de atribuição — apenas ADMIN/GERENTE */}
                        {podeGerenciar && (
                            <Button variant="ghost" size="sm" onClick={() => abrirAtribuicao(c)}
                                    className="text-xs h-7 text-primary">
                              <UserCog className="h-3 w-3 mr-1" />Carteira
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openEdit(c)} className="text-xs h-7">
                          <Pencil className="h-3 w-3 mr-1" />Editar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive">
                              <Trash2 className="h-3 w-3 mr-1" />Excluir
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="border-glow bg-card">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove.mutate(c.id)} className="bg-destructive text-white">
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
              ))}
            </motion.div>
        )}

        {/* Modo tabela */}
        {!isLoading && filtered.length > 0 && viewMode === 'table' && (
            <Card className="border-glow bg-card">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30 hover:bg-transparent">
                      <TableHead className="text-xs text-muted-foreground">Nome</TableHead>
                      <TableHead className="text-xs text-muted-foreground">CPF/CNPJ</TableHead>
                      <TableHead className="text-xs text-muted-foreground">Contato</TableHead>
                      {podeGerenciar && <TableHead className="text-xs text-muted-foreground">Responsável</TableHead>}
                      <TableHead className="text-xs text-muted-foreground">Status</TableHead>
                      <TableHead className="text-xs text-muted-foreground w-44">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(c => (
                        <TableRow key={c.id} className="border-border/20 hover:bg-primary/5 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <AvatarInitials name={c.nome} size="sm" />
                              <span className="text-sm font-medium">{c.nome}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {c.cpfCnpj ? formatarDocumento(c.cpfCnpj) : '-'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {c.telefone || c.email || '-'}
                          </TableCell>
                          {podeGerenciar && (
                              <TableCell>
                                {c.ownerNome
                                    ? <span className="text-xs text-muted-foreground">{c.ownerNome}</span>
                                    : <span className="text-xs text-[hsl(38,92%,50%)] flex items-center gap-1">
                              <UserMinus className="h-3 w-3" />Sem responsável
                            </span>
                                }
                              </TableCell>
                          )}
                          <TableCell><StatusBadge status={c.status} /></TableCell>
                          <TableCell>
                            <div className="flex gap-1 items-center flex-wrap">
                              {/* Aprovação inline na tabela */}
                              {podeGerenciar && c.status === 'PENDENTE' && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-[hsl(160,84%,39%)]"
                                            title="Aprovar" disabled={updateStatus.isPending}
                                            onClick={() => handleAprovar(c)}>
                                      <CheckCircle className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                                            title="Rejeitar"
                                            onClick={() => setRejeicao({ open: true, customerId: c.id, motivo: '' })}>
                                      <XCircle className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                              )}
                              {/* Atribuição de carteira */}
                              {podeGerenciar && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-primary"
                                          title="Atribuir responsável" onClick={() => abrirAtribuicao(c)}>
                                    <UserCog className="h-3.5 w-3.5" />
                                  </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="border-glow bg-card">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir?</AlertDialogTitle>
                                    <AlertDialogDescription>Não pode ser desfeito.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => remove.mutate(c.id)} className="bg-destructive text-white">
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

        {/* Modal — criar / editar cliente */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="border-glow bg-card">
            <DialogHeader><DialogTitle>{editing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                       required className="bg-muted border-border/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                         placeholder="(00) 00000-0000" className="bg-muted border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                         className="bg-muted border-border/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))}
                         className="bg-muted border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label>CPF / CNPJ</Label>
                  <Input value={form.cpfCnpj} onChange={e => setForm(f => ({ ...f, cpfCnpj: e.target.value }))}
                         placeholder="000.000.000-00 ou 00.000.000/0001-00"
                         className="bg-muted border-border/50 font-mono" maxLength={18} />
                </div>
              </div>
              <Button type="submit" className="w-full gradient-primary border-0 text-white" disabled={isPending}>
                {isPending ? 'Salvando...' : editing ? 'Salvar' : 'Criar Cliente'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal — motivo de rejeição */}
        <Dialog open={rejeicao.open} onOpenChange={o => setRejeicao(r => ({ ...r, open: o }))}>
          <DialogContent className="border-glow bg-card">
            <DialogHeader><DialogTitle>Rejeitar cliente</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Motivo da rejeição *</Label>
                <Textarea value={rejeicao.motivo}
                          onChange={e => setRejeicao(r => ({ ...r, motivo: e.target.value }))}
                          placeholder="Descreva o motivo da rejeição..."
                          className="bg-muted border-border/50" rows={4} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline"
                        onClick={() => setRejeicao({ open: false, customerId: null, motivo: '' })}>
                  Cancelar
                </Button>
                <Button className="bg-destructive text-white hover:bg-destructive/90"
                        disabled={!rejeicao.motivo.trim() || updateStatus.isPending}
                        onClick={handleRejeitar}>
                  {updateStatus.isPending ? 'Rejeitando...' : 'Confirmar rejeição'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal — atribuição de responsável (carteira) */}
        <Dialog open={atribuicao.open}
                onOpenChange={o => setAtribuicao(s => ({ ...s, open: o }))}>
          <DialogContent className="border-glow bg-card">
            <DialogHeader>
              <DialogTitle>
                Atribuir responsável — {atribuicao.customer?.nome}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Owner atual */}
              <div className="p-3 rounded-lg bg-muted/40 border border-border/30 text-sm">
                <span className="text-muted-foreground">Responsável atual: </span>
                <span className="font-medium">
                {atribuicao.customer?.ownerNome ?? (
                    <span className="text-[hsl(38,92%,50%)]">sem responsável</span>
                )}
              </span>
              </div>

              <div className="space-y-2">
                <Label>Novo responsável</Label>
                <Select
                    value={atribuicao.ownerIdSelecionado}
                    onValueChange={v => setAtribuicao(s => ({ ...s, ownerIdSelecionado: v }))}
                >
                  <SelectTrigger className="bg-muted border-border/50">
                    <SelectValue placeholder="Selecione um responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Opção para desatribuir explicitamente */}
                    <SelectItem value={DESATRIBUIR}>
                    <span className="flex items-center gap-2 text-[hsl(38,92%,50%)]">
                      <UserMinus className="h-3.5 w-3.5" />Remover responsável
                    </span>
                    </SelectItem>
                    {usuariosElegiveis.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                      <span className="flex items-center gap-2">
                        {u.nome}
                        <span className="text-[10px] text-muted-foreground ml-1">
                          ({u.role})
                        </span>
                      </span>
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Apenas VENDEDOR e GERENTE podem ser responsáveis por clientes.
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline"
                        onClick={() => setAtribuicao({ open: false, customer: null, ownerIdSelecionado: '' })}>
                  Cancelar
                </Button>
                <Button
                    className="gradient-primary border-0 text-white"
                    disabled={!atribuicao.ownerIdSelecionado || updateOwner.isPending}
                    onClick={handleConfirmarAtribuicao}
                >
                  {updateOwner.isPending ? 'Salvando...' : 'Confirmar atribuição'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
  );
}