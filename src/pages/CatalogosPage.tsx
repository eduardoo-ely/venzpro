import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFilesByOrg, createFile, deleteFile, getCompaniesByOrg } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Trash2, ExternalLink, FileText, Image, FolderOpen } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { motion } from 'framer-motion';
import type { CatalogFile, FileType } from '@/types';

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
      <PageHeader title="Catálogos" subtitle="Arquivos e documentos por empresa">
        <Button onClick={openNew} className="gradient-primary border-0 text-white shadow-lg shadow-primary/25">
          <Plus className="h-4 w-4 mr-2" />Novo Arquivo
        </Button>
      </PageHeader>

      {files.length === 0 ? (
        <EmptyState icon={FolderOpen} title="Nenhum catálogo cadastrado" description="Adicione PDFs, imagens e outros documentos de suas empresas parceiras." actionLabel="Novo Arquivo" onAction={openNew} />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {files.map(f => (
            <Card key={f.id} className="border-glow glow-card bg-card group">
              <CardContent className="p-5 flex flex-col items-center text-center">
                <div className={`h-16 w-16 rounded-2xl flex items-center justify-center mb-4 ${f.tipo === 'PDF' ? 'bg-destructive/10' : 'bg-status-info/10'}`}>
                  {f.tipo === 'PDF'
                    ? <FileText className="h-8 w-8 text-destructive" />
                    : <Image className="h-8 w-8 text-status-info" />}
                </div>
                <p className="font-semibold text-sm mb-1 truncate w-full">{f.nome}</p>
                <Badge variant="outline" className="text-[10px] mb-3">{f.empresaNome || f.empresaId}</Badge>
                <div className="flex gap-2 mt-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => window.open(f.url, '_blank')}>
                    <ExternalLink className="h-3 w-3 mr-1" />Abrir
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="h-7 text-xs text-destructive"><Trash2 className="h-3 w-3 mr-1" />Excluir</Button></AlertDialogTrigger>
                    <AlertDialogContent className="border-glow bg-card"><AlertDialogHeader><AlertDialogTitle>Excluir arquivo?</AlertDialogTitle><AlertDialogDescription>Não pode ser desfeito.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteMut.mutate(f.id)} className="bg-destructive text-white">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-glow bg-card">
          <DialogHeader><DialogTitle>Novo Arquivo</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required className="bg-muted border-border/50" /></div>
            <div className="space-y-2"><Label>URL *</Label><Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} required className="bg-muted border-border/50" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v as FileType }))}>
                  <SelectTrigger className="bg-muted border-border/50"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="PDF">PDF</SelectItem><SelectItem value="IMAGEM">Imagem</SelectItem></SelectContent>
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
            <Button type="submit" className="w-full gradient-primary border-0 text-white">Criar Arquivo</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
