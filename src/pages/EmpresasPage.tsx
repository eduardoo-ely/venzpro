import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCompaniesByOrg, createCompany, updateCompany, deleteCompany } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import type { Company } from '@/types';

export default function EmpresasPage() {
  const { organization } = useAuth();
  const orgId = organization?.id || '';
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [nome, setNome] = useState('');

  const { data: companies = [] } = useQuery({ queryKey: ['companies', orgId], queryFn: () => getCompaniesByOrg(orgId), enabled: !!orgId });

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Empresas</h1>
          <p className="text-muted-foreground">Gerencie as empresas parceiras</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nova Empresa</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Nome *</Label><Input value={nome} onChange={e => setNome(e.target.value)} required /></div>
              <Button type="submit" className="w-full">{editing ? 'Salvar' : 'Criar'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {companies.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">Nenhuma empresa cadastrada ainda.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map(c => (
            <Card key={c.id} className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <CardTitle className="text-base">{c.nome}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Excluir empresa?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteMut.mutate(c.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Cadastrado em {c.createdAt ? new Date(c.createdAt).toLocaleDateString('pt-BR') : '-'}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
