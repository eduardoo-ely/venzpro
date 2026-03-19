import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFilesByOrg, createFile, deleteFile, getCompaniesByOrg } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import type { CatalogFile, FileType } from '@/types';

const FILE_TYPES: FileType[] = ['PDF', 'IMAGEM'];

export default function CatalogosPage() {
  const { organization } = useAuth();
  const orgId = organization?.id || '';
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', url: '', tipo: 'PDF' as FileType, empresaId: '' });

  const { data: files = [] } = useQuery({ queryKey: ['files', orgId], queryFn: () => getFilesByOrg(orgId), enabled: !!orgId });
  const { data: companies = [] } = useQuery({ queryKey: ['companies', orgId], queryFn: () => getCompaniesByOrg(orgId), enabled: !!orgId });

  const createMut = useMutation({ mutationFn: (d: Partial<CatalogFile>) => createFile(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['files'] }); setOpen(false); } });
  const deleteMut = useMutation({ mutationFn: (id: string) => deleteFile(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }) });

  const openNew = () => { setForm({ nome: '', url: '', tipo: 'PDF', empresaId: '' }); setOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate({ ...form, organizationId: orgId });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Catálogos</h1>
          <p className="text-muted-foreground">Arquivos e catálogos das empresas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Arquivo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Arquivo</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>URL *</Label><Input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} required placeholder="https://..." /></div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v as FileType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FILE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Empresa *</Label>
                <Select value={form.empresaId} onValueChange={v => setForm(p => ({ ...p, empresaId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Criar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum arquivo cadastrado</TableCell></TableRow>
            ) : files.map(f => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.nome}</TableCell>
                <TableCell><Badge variant="secondary">{f.tipo}</Badge></TableCell>
                <TableCell>{f.empresaNome || f.empresaId}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" asChild><a href={f.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Excluir arquivo?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteMut.mutate(f.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
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
