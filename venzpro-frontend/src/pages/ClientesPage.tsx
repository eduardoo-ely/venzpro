import { useState } from 'react';
import { useCustomers } from '@/hooks/useCustomers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Search, LayoutGrid, List, Phone, Mail, MapPin, Users } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { AvatarInitials } from '@/components/AvatarInitials';
import { motion } from 'framer-motion';
import type { Customer } from '@/types';

type Form = { nome: string; telefone: string; email: string; cidade: string };
const emptyForm: Form = { nome: '', telefone: '', email: '', cidade: '' };

export default function ClientesPage() {
  const { customers, isLoading, create, update, remove } = useCustomers();
  const [open,     setOpen]     = useState(false);
  const [editing,  setEditing]  = useState<Customer | null>(null);
  const [search,   setSearch]   = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [form,     setForm]     = useState<Form>(emptyForm);

  const filtered = customers.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.cidade?.toLowerCase().includes(search.toLowerCase())
  );

  const openNew  = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ nome: c.nome, telefone: c.telefone ?? '', email: c.email ?? '', cidade: c.cidade ?? '' });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { nome: form.nome, telefone: form.telefone || undefined, email: form.email || undefined, cidade: form.cidade || undefined };
    if (editing) {
      await update.mutateAsync({ id: editing.id, ...payload });
    } else {
      await create.mutateAsync(payload);
    }
    setOpen(false);
  };

  const isPending = create.isPending || update.isPending;

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
          <Input placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 w-60 bg-muted border-border/50" />
        </div>
        <Button onClick={openNew} className="gradient-primary border-0 text-white shadow-lg shadow-primary/25">
          <Plus className="h-4 w-4 mr-2" />Novo Cliente
        </Button>
      </PageHeader>

      {/* Loading skeleton */}
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

      {!isLoading && filtered.length > 0 && viewMode === 'grid' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(c => (
            <Card key={c.id} className="border-glow glow-card bg-card group">
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <AvatarInitials name={c.nome} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{c.nome}</p>
                    {c.cidade && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{c.cidade}</p>}
                  </div>
                </div>
                {c.telefone && <p className="text-xs text-muted-foreground flex items-center gap-2 mb-1"><Phone className="h-3 w-3" />{c.telefone}</p>}
                {c.email    && <p className="text-xs text-muted-foreground flex items-center gap-2"><Mail className="h-3 w-3" />{c.email}</p>}
                <div className="flex gap-1 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(c)} className="text-xs h-7"><Pencil className="h-3 w-3 mr-1" />Editar</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive"><Trash2 className="h-3 w-3 mr-1" />Excluir</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="border-glow bg-card">
                      <AlertDialogHeader><AlertDialogTitle>Excluir cliente?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove.mutate(c.id)} className="bg-destructive text-white">Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {!isLoading && filtered.length > 0 && viewMode === 'table' && (
        <Card className="border-glow bg-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/30 hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground">Nome</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Telefone</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Email</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Cidade</TableHead>
                  <TableHead className="text-xs text-muted-foreground w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id} className="border-border/20 hover:bg-primary/5 transition-colors">
                    <TableCell><div className="flex items-center gap-2"><AvatarInitials name={c.nome} size="sm" /><span className="text-sm font-medium">{c.nome}</span></div></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.telefone || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.email || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.cidade || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                          <AlertDialogContent className="border-glow bg-card">
                            <AlertDialogHeader><AlertDialogTitle>Excluir?</AlertDialogTitle><AlertDialogDescription>Não pode ser desfeito.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate(c.id)} className="bg-destructive text-white">Excluir</AlertDialogAction></AlertDialogFooter>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-glow bg-card">
          <DialogHeader><DialogTitle>{editing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required className="bg-muted border-border/50" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} className="bg-muted border-border/50" /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="bg-muted border-border/50" /></div>
            </div>
            <div className="space-y-2"><Label>Cidade</Label><Input value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} className="bg-muted border-border/50" /></div>
            <Button type="submit" className="w-full gradient-primary border-0 text-white" disabled={isPending}>
              {isPending ? 'Salvando...' : editing ? 'Salvar' : 'Criar Cliente'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
