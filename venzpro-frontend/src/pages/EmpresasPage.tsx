import { useState } from 'react';
import { useCompanies } from '@/hooks/useCompanies';
import { useOrders } from '@/hooks/useOrders';
import { useFiles } from '@/hooks/useFiles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Building2, Package, FolderOpen } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { AvatarInitials } from '@/components/AvatarInitials';
import { motion } from 'framer-motion';
import type { Company } from '@/types';

export default function EmpresasPage() {
  const { companies, isLoading, create, update, remove } = useCompanies();
  const { orders }  = useOrders();
  const { files }   = useFiles();

  const [open,    setOpen]    = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [nome,    setNome]    = useState('');

  const openNew  = () => { setEditing(null); setNome(''); setOpen(true); };
  const openEdit = (c: Company) => { setEditing(c); setNome(c.nome); setOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) await update.mutateAsync({ id: editing.id, nome });
    else         await create.mutateAsync({ nome });
    setOpen(false);
  };

  const isPending = create.isPending || update.isPending;

  return (
    <div className="space-y-6">
      <PageHeader title="Empresas" subtitle="Diretório de empresas parceiras">
        <Button onClick={openNew} className="gradient-primary border-0 text-white shadow-lg shadow-primary/25">
          <Plus className="h-4 w-4 mr-2" />Nova Empresa
        </Button>
      </PageHeader>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-glow bg-card"><CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3"><Skeleton className="h-12 w-12 rounded-xl" /><div className="space-y-1 flex-1"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div>
              <div className="flex gap-4"><Skeleton className="h-3 w-20" /><Skeleton className="h-3 w-20" /></div>
            </CardContent></Card>
          ))}
        </div>
      )}

      {!isLoading && companies.length === 0 && (
        <EmptyState icon={Building2} title="Nenhuma empresa cadastrada"
          description="Adicione empresas parceiras para vincular pedidos e catálogos."
          actionLabel="Nova Empresa" onAction={openNew} />
      )}

      {!isLoading && companies.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map(c => {
            const orderCount = orders.filter(o => o.companyId === c.id).length;
            const fileCount  = files.filter(f => f.companyId === c.id).length;
            return (
              <Card key={c.id} className="border-glow glow-card bg-card group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <AvatarInitials name={c.nome} size="lg" />
                      <div>
                        <p className="font-semibold letter-tight">{c.nome}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Cadastrado em {c.createdAt ? new Date(c.createdAt).toLocaleDateString('pt-BR') : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Package className="h-3.5 w-3.5" /><span>{orderCount} pedidos</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <FolderOpen className="h-3.5 w-3.5" /><span>{fileCount} catálogos</span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(c)} className="text-xs h-7"><Pencil className="h-3 w-3 mr-1" />Editar</Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive"><Trash2 className="h-3 w-3 mr-1" />Excluir</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="border-glow bg-card">
                        <AlertDialogHeader><AlertDialogTitle>Excluir empresa?</AlertDialogTitle><AlertDialogDescription>Não pode ser desfeito.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate(c.id)} className="bg-destructive text-white">Excluir</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-glow bg-card">
          <DialogHeader><DialogTitle>{editing ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={nome} onChange={e => setNome(e.target.value)} required className="bg-muted border-border/50" /></div>
            <Button type="submit" className="w-full gradient-primary border-0 text-white" disabled={isPending}>
              {isPending ? 'Salvando...' : editing ? 'Salvar' : 'Criar Empresa'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
