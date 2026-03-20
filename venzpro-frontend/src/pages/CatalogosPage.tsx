import { useState } from 'react';
import { useFiles } from '@/hooks/useFiles';
import { useCompanies } from '@/hooks/useCompanies';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, ExternalLink, FileText } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import type { CatalogFile } from '@/types';

type Form = { nome: string; url: string; tipo: CatalogFile['tipo']; companyId: string };
const emptyForm: Form = { nome: '', url: '', tipo: 'PDF', companyId: '' };

export default function CatalogosPage() {
  const { files, isLoading, create, remove } = useFiles();
  const { companies } = useCompanies();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);

  const enriched = files.map(f => ({
    ...f,
    empresaNome: companies.find(c => c.id === f.companyId)?.nome,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await create.mutateAsync({ nome: form.nome, url: form.url, tipo: form.tipo, companyId: form.companyId });
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Catálogos" subtitle="Arquivos e catálogos das empresas">
        <Button onClick={() => { setForm(emptyForm); setOpen(true); }} className="gradient-primary border-0 text-white shadow-lg shadow-primary/25">
          <Plus className="h-4 w-4 mr-2" />Novo Arquivo
        </Button>
      </PageHeader>

      {isLoading && (
        <Card className="border-glow bg-card">
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-1/4" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!isLoading && enriched.length === 0 && (
        <EmptyState icon={FileText} title="Nenhum arquivo cadastrado"
          description="Adicione catálogos e materiais das empresas parceiras."
          actionLabel="Novo Arquivo" onAction={() => { setForm(emptyForm); setOpen(true); }} />
      )}

      {!isLoading && enriched.length > 0 && (
        <Card className="border-glow bg-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/30 hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground">Nome</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Tipo</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Empresa</TableHead>
                  <TableHead className="text-xs text-muted-foreground w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enriched.map(f => (
                  <TableRow key={f.id} className="border-border/20 hover:bg-primary/5 transition-colors">
                    <TableCell className="font-medium text-sm">{f.nome}</TableCell>
                    <TableCell><Badge variant="secondary">{f.tipo}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.empresaNome || f.companyId}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a href={f.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="border-glow bg-card">
                          <AlertDialogHeader><AlertDialogTitle>Excluir arquivo?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate(f.id)} className="bg-destructive text-white">Excluir</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
          <DialogHeader><DialogTitle>Novo Arquivo</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} required className="bg-muted border-border/50" /></div>
            <div className="space-y-2"><Label>URL *</Label><Input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} required placeholder="https://..." className="bg-muted border-border/50" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v as CatalogFile['tipo'] }))}>
                  <SelectTrigger className="bg-muted border-border/50"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="PDF">PDF</SelectItem><SelectItem value="IMAGEM">Imagem</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Empresa *</Label>
                <Select value={form.companyId} onValueChange={v => setForm(p => ({ ...p, companyId: v }))}>
                  <SelectTrigger className="bg-muted border-border/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full gradient-primary border-0 text-white" disabled={create.isPending || !form.companyId}>
              {create.isPending ? 'Salvando...' : 'Criar'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
