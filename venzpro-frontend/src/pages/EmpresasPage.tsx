import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCompaniesByOrg, getOrdersByOrg, getFilesByOrg, createCompany, updateCompany, deleteCompany } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Building2, Package, FolderOpen } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { AvatarInitials } from '@/components/AvatarInitials';
import { motion } from 'framer-motion';
import type { Company } from '@/types';

export default function EmpresasPage() {
  const { organization } = useAuth();
  const orgId = organization?.id || '';
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [nome, setNome] = useState('');

  const { data: companies = [] } = useQuery({ queryKey: ['companies', orgId], queryFn: () => getCompaniesByOrg(orgId), enabled: !!orgId });
  const { data: orders = [] } = useQuery({ queryKey: ['orders', orgId], queryFn: () => getOrdersByOrg(orgId), enabled: !!orgId });
  const { data: files = [] } = useQuery({ queryKey: ['files', orgId], queryFn: () => getFilesByOrg(orgId), enabled: !!orgId });

  const createMut = useMutation({ mutationFn: (d: Partial<Company>) => createCompany(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['companies'] }); setOpen(false); } });
  const updateMut = useMutation({ mutationFn: ({ id, d }: { id: string; d: Partial<Company> }) => updateCompany(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['companies'] }); setOpen(false); } });
  const deleteMut = useMutation({ mutationFn: (id: string) => deleteCompany(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }) });

  const openNew = () => { setEditing(null); setNome(''); setOpen(true); };
  const openEdit = (c: Company) => { setEditing(c); setNome(c.nome); setOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) updateMut.mutate({ id: editing.id, d: { nome } });
    else createMut.mutate({ nome, organizationId: orgId });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Empresas" subtitle="Diretório de empresas parceiras">
        <Button onClick={openNew} className="gradient-primary border-0 text-white shadow-lg shadow-primary/25">
          <Plus className="h-4 w-4 mr-2" />Nova Empresa
        </Button>
      </PageHeader>

      {companies.length === 0 ? (
        <EmptyState icon={Building2} title="Nenhuma empresa cadastrada" description="Adicione empresas parceiras para vincular pedidos e catálogos." actionLabel="Nova Empresa" onAction={openNew} />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map(c => {
            const orderCount = orders.filter(o => o.empresaId === c.id).length;
            const fileCount = files.filter(f => f.empresaId === c.id).length;
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
                      <Package className="h-3.5 w-3.5" />
                      <span>{orderCount} pedidos</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <FolderOpen className="h-3.5 w-3.5" />
                      <span>{fileCount} catálogos</span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(c)} className="text-xs h-7"><Pencil className="h-3 w-3 mr-1" />Editar</Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-xs h-7 text-destructive"><Trash2 className="h-3 w-3 mr-1" />Excluir</Button></AlertDialogTrigger>
                      <AlertDialogContent className="border-glow bg-card"><AlertDialogHeader><AlertDialogTitle>Excluir empresa?</AlertDialogTitle><AlertDialogDescription>Não pode ser desfeito.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteMut.mutate(c.id)} className="bg-destructive text-white">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
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
            <Button type="submit" className="w-full gradient-primary border-0 text-white">{editing ? 'Salvar' : 'Criar Empresa'}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
