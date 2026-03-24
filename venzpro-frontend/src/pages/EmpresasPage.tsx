import { useState, useMemo } from 'react';
import { useCompanies } from '@/hooks/useCompanies';
import { useOrders } from '@/hooks/useOrders';
import { useFiles } from '@/hooks/useFiles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Building2, Package, FolderOpen, Search, MapPin } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { AvatarInitials } from '@/components/AvatarInitials';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import axios from 'axios';
import type { Company } from '@/types';

// Estado inicial expandido para suportar a Regra 6
const INITIAL_FORM = {
  nome: '',
  cnpj: '',
  razaoSocial: '',
  cep: '',
  logradouro: '',
  numero: '',
  cidade: '',
  uf: ''
};

export default function EmpresasPage() {
  const { companies, isLoading, create, update, remove } = useCompanies();
  const { orders = [] } = useOrders();
  const { files = [] } = useFiles();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [isSearchingCNPJ, setIsSearchingCNPJ] = useState(false);

  // Otimização: Indexa contagens para evitar filtros pesados no render
  const stats = useMemo(() => {
    const map = new Map();
    companies.forEach(c => {
      map.set(c.id, {
        orders: orders.filter(o => o.companyId === c.id).length,
        files: files.filter(f => f.companyId === c.id).length
      });
    });
    return map;
  }, [companies, orders, files]);

  // Busca Automática — Regra 21
  const handleCNPJBlur = async () => {
    const cnpj = formData.cnpj.replace(/\D/g, '');
    if (cnpj.length !== 14) return;

    setIsSearchingCNPJ(true);
    try {
      const { data } = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      setFormData(prev => ({
        ...prev,
        nome: data.nome_fantasia || data.razao_social,
        razaoSocial: data.razao_social,
        cep: data.cep,
        logradouro: data.logradouro,
        cidade: data.municipio,
        uf: data.uf
      }));
      toast.success("Dados da empresa importados!");
    } catch {
      toast.error("CNPJ não encontrado. Preencha manualmente.");
    } finally {
      setIsSearchingCNPJ(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) await update.mutateAsync({ ...formData, id: editing.id });
      else await create.mutateAsync(formData);
      setOpen(false);
      setFormData(INITIAL_FORM);
    } catch (err) {
      toast.error("Erro ao salvar empresa.");
    }
  };

  const openEdit = (c: Company) => {
    setEditing(c);
    setFormData({ ...INITIAL_FORM, ...c });
    setOpen(true);
  };

  return (
      <div className="space-y-6">
        <PageHeader title="Empresas" subtitle="Gerencie suas representadas e parceiros.">
          <Button onClick={() => { setEditing(null); setFormData(INITIAL_FORM); setOpen(true); }} className="gradient-primary border-0 text-white">
            <Plus className="h-4 w-4 mr-2" />Nova Empresa
          </Button>
        </PageHeader>

        {/* Grid de Cards com Animação e Contagens Otimizadas */}
        {!isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map(c => (
                  <Card key={c.id} className="group border-glow bg-card hover:border-primary/50 transition-all">
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <AvatarInitials name={c.nome} size="lg" />
                          <div>
                            <h3 className="font-bold text-sm leading-none">{c.nome}</h3>
                            <p className="text-[10px] text-muted-foreground mt-1 uppercase font-mono">{c.cnpj || 'SEM CNPJ'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-muted/50 p-2 rounded-lg flex items-center gap-2">
                          <Package className="h-3 w-3 text-primary" />
                          <span className="text-[11px] font-medium">{stats.get(c.id)?.orders || 0} Pedidos</span>
                        </div>
                        <div className="bg-muted/50 p-2 rounded-lg flex items-center gap-2">
                          <FolderOpen className="h-3 w-3 text-primary" />
                          <span className="text-[11px] font-medium">{stats.get(c.id)?.files || 0} Catálogos</span>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 border-t border-border/50 pt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(c)} className="h-8 text-xs"><Pencil className="h-3 w-3 mr-1" />Editar</Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive"><Trash2 className="h-3 w-3 mr-1" />Excluir</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão?</AlertDialogTitle><AlertDialogDescription>Isso pode afetar pedidos vinculados.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove.mutate(c.id)} className="bg-destructive">Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
              ))}
            </div>
        )}

        {/* Dialog de Cadastro Expandido */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md bg-card">
            <DialogHeader><DialogTitle>{editing ? 'Editar Representada' : 'Nova Representada'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <Label>CNPJ (Busca Automática)</Label>
                  <div className="relative">
                    <Input
                        placeholder="00.000.000/0000-00"
                        value={formData.cnpj}
                        onChange={e => setFormData({...formData, cnpj: e.target.value})}
                        onBlur={handleCNPJBlur}
                        disabled={isSearchingCNPJ}
                    />
                    {isSearchingCNPJ && <Search className="absolute right-3 top-2.5 h-4 w-4 animate-bounce text-primary" />}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Nome Fantasia *</Label>
                  <Input value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5"><Label>Cidade</Label><Input value={formData.cidade} readOnly className="bg-muted" /></div>
                  <div className="space-y-1.5"><Label>UF</Label><Input value={formData.uf} readOnly className="bg-muted" /></div>
                </div>
              </div>
              <Button type="submit" className="w-full gradient-primary text-white" disabled={create.isPending || update.isPending}>
                {editing ? 'Salvar Alterações' : 'Cadastrar Empresa'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
  );
}