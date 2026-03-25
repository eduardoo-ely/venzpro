import { useState, useMemo } from 'react';
import { useCompanies } from '@/hooks/useCompanies';
import { useOrders } from '@/hooks/useOrders';
import { useFiles } from '@/hooks/useFiles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Package, FolderOpen, Search, MapPin, Building2, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { AvatarInitials } from '@/components/AvatarInitials';
import { toast } from 'sonner';
import axios from 'axios';
import type { Company } from '@/types';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface CompanyForm {
  nome:        string;
  cnpj:        string;
  razaoSocial: string;
  cep:         string;
  logradouro:  string;
  numero:      string;
  complemento: string;
  bairro:      string;
  cidade:      string;
  uf:          string;
}

const EMPTY_FORM: CompanyForm = {
  nome: '', cnpj: '', razaoSocial: '',
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
}

function formatCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, '$1-$2');
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function EmpresasPage() {
  const { companies, isLoading, create, update, remove } = useCompanies();
  const { orders = [] }  = useOrders();
  const { files  = [] }  = useFiles();

  const [open,            setOpen]            = useState(false);
  const [editing,         setEditing]         = useState<Company | null>(null);
  const [form,            setForm]            = useState<CompanyForm>(EMPTY_FORM);
  const [isSearchingCNPJ, setIsSearchingCNPJ] = useState(false);

  // Contagens por empresa (otimizado com Map)
  const stats = useMemo(() => {
    const map = new Map<string, { orders: number; files: number }>();
    companies.forEach(c => map.set(c.id, { orders: 0, files: 0 }));
    orders.forEach(o => {
      const s = map.get(o.companyId);
      if (s) s.orders++;
    });
    files.forEach(f => {
      const s = map.get(f.companyId);
      if (s) s.files++;
    });
    return map;
  }, [companies, orders, files]);

  // ── Handlers — CNPJ ──────────────────────────────────────────────────────────

  const handleCNPJChange = (value: string) => {
    setForm(f => ({ ...f, cnpj: formatCNPJ(value) }));
  };

  const handleCNPJBlur = async () => {
    const digits = form.cnpj.replace(/\D/g, '');
    if (digits.length !== 14) return;

    setIsSearchingCNPJ(true);
    try {
      const { data } = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      setForm(f => ({
        ...f,
        nome:        data.nome_fantasia?.trim() || data.razao_social?.trim() || f.nome,
        razaoSocial: data.razao_social?.trim()  || '',
        cep:         data.cep         ? formatCEP(data.cep)                  : '',
        logradouro:  data.logradouro?.trim()     || '',
        bairro:      data.bairro?.trim()         || '',
        cidade:      data.municipio?.trim()      || '',
        uf:          data.uf?.trim().toUpperCase() || '',
      }));
      toast.success('Dados importados da Receita Federal!');
    } catch {
      toast.error('CNPJ não encontrado. Preencha os dados manualmente.');
    } finally {
      setIsSearchingCNPJ(false);
    }
  };

  // ── Handlers — formulário ─────────────────────────────────────────────────────

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (c: Company) => {
    setEditing(c);
    setForm({
      nome:        c.nome        ?? '',
      cnpj:        c.cnpj        ?? '',
      razaoSocial: c.razaoSocial ?? '',
      cep:         c.cep         ?? '',
      logradouro:  c.logradouro  ?? '',
      numero:      c.numero      ?? '',
      complemento: c.complemento ?? '',
      bairro:      c.bairro      ?? '',
      cidade:      c.cidade      ?? '',
      uf:          c.uf          ?? '',
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Envia todos os campos — backend agora persiste todos corretamente
    const payload = {
      nome:        form.nome,
      cnpj:        form.cnpj        || undefined,
      razaoSocial: form.razaoSocial || undefined,
      cep:         form.cep         || undefined,
      logradouro:  form.logradouro  || undefined,
      numero:      form.numero      || undefined,
      complemento: form.complemento || undefined,
      bairro:      form.bairro      || undefined,
      cidade:      form.cidade      || undefined,
      uf:          form.uf          || undefined,
    };

    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...payload });
      } else {
        await create.mutateAsync(payload);
      }
      setOpen(false);
    } catch {
      // Erro já exibido pelo hook via notify.apiError
    }
  };

  const isPending = create.isPending || update.isPending;

  // ── JSX ───────────────────────────────────────────────────────────────────────

  return (
      <div className="space-y-6">
        <PageHeader title="Empresas" subtitle="Gerencie suas representadas e parceiros">
          <Button
              onClick={openNew}
              className="gradient-primary border-0 text-white shadow-lg shadow-primary/25"
          >
            <Plus className="h-4 w-4 mr-2" />Nova Empresa
          </Button>
        </PageHeader>

        {/* Skeletons */}
        {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="border-glow bg-card">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-1 flex-1">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </CardContent>
                  </Card>
              ))}
            </div>
        )}

        {/* Empty state */}
        {!isLoading && companies.length === 0 && (
            <EmptyState
                icon={Building2}
                title="Nenhuma empresa cadastrada"
                description="Adicione as empresas cujos produtos você representa ou vende."
                actionLabel="Nova Empresa"
                onAction={openNew}
            />
        )}

        {/* Grid de cards */}
        {!isLoading && companies.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map(c => {
                const s = stats.get(c.id) ?? { orders: 0, files: 0 };
                return (
                    <Card key={c.id} className="group border-glow bg-card hover:border-primary/50 transition-all">
                      <CardContent className="p-5">
                        {/* Cabeçalho do card */}
                        <div className="flex items-start gap-3 mb-4">
                          <AvatarInitials name={c.nome} size="lg" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm leading-tight truncate">{c.nome}</h3>
                            {c.razaoSocial && c.razaoSocial !== c.nome && (
                                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                  {c.razaoSocial}
                                </p>
                            )}
                            {c.cnpj ? (
                                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                  {c.cnpj}
                                </p>
                            ) : (
                                <p className="text-[10px] text-muted-foreground/50 italic mt-0.5">
                                  Sem CNPJ
                                </p>
                            )}
                          </div>
                        </div>

                        {/* Endereço */}
                        {(c.cidade || c.logradouro) && (
                            <p className="text-[11px] text-muted-foreground flex items-start gap-1.5 mb-3">
                              <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                              <span className="truncate">
                        {[c.logradouro, c.numero, c.bairro, c.cidade, c.uf]
                            .filter(Boolean)
                            .join(', ')}
                      </span>
                            </p>
                        )}

                        {/* Contadores */}
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <div className="bg-muted/50 p-2 rounded-lg flex items-center gap-2">
                            <Package className="h-3 w-3 text-primary" />
                            <span className="text-[11px] font-medium">{s.orders} Pedido{s.orders !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="bg-muted/50 p-2 rounded-lg flex items-center gap-2">
                            <FolderOpen className="h-3 w-3 text-primary" />
                            <span className="text-[11px] font-medium">{s.files} Catálogo{s.files !== 1 ? 's' : ''}</span>
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="flex justify-end gap-2 border-t border-border/50 pt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                              variant="ghost" size="sm"
                              onClick={() => openEdit(c)}
                              className="h-8 text-xs"
                          >
                            <Pencil className="h-3 w-3 mr-1" />Editar
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive">
                                <Trash2 className="h-3 w-3 mr-1" />Excluir
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="border-glow bg-card">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir {c.nome}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. Pedidos e catálogos vinculados podem ser afetados.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => remove.mutate(c.id)}
                                    className="bg-destructive text-white"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                );
              })}
            </div>
        )}

        {/* Modal — criar / editar empresa */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="border-glow bg-card max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* CNPJ com busca automática */}
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <div className="relative">
                  <Input
                      value={form.cnpj}
                      onChange={e => handleCNPJChange(e.target.value)}
                      onBlur={handleCNPJBlur}
                      placeholder="00.000.000/0000-00"
                      disabled={isSearchingCNPJ}
                      className="bg-muted border-border/50 font-mono pr-9"
                  />
                  {isSearchingCNPJ && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Digite o CNPJ e pressione Tab para buscar automaticamente os dados da Receita Federal.
                </p>
              </div>

              {/* Nome fantasia */}
              <div className="space-y-2">
                <Label>Nome fantasia <span className="text-destructive">*</span></Label>
                <Input
                    value={form.nome}
                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    required
                    className="bg-muted border-border/50"
                />
              </div>

              {/* Razão social */}
              <div className="space-y-2">
                <Label>Razão social</Label>
                <Input
                    value={form.razaoSocial}
                    onChange={e => setForm(f => ({ ...f, razaoSocial: e.target.value }))}
                    className="bg-muted border-border/50"
                />
              </div>

              {/* Endereço — linha 1 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2 col-span-1">
                  <Label>CEP</Label>
                  <Input
                      value={form.cep}
                      onChange={e => setForm(f => ({ ...f, cep: formatCEP(e.target.value) }))}
                      placeholder="00000-000"
                      className="bg-muted border-border/50 font-mono"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Logradouro</Label>
                  <Input
                      value={form.logradouro}
                      onChange={e => setForm(f => ({ ...f, logradouro: e.target.value }))}
                      className="bg-muted border-border/50"
                  />
                </div>
              </div>

              {/* Endereço — linha 2 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input
                      value={form.numero}
                      onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
                      placeholder="Ex: 123"
                      className="bg-muted border-border/50"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Complemento</Label>
                  <Input
                      value={form.complemento}
                      onChange={e => setForm(f => ({ ...f, complemento: e.target.value }))}
                      placeholder="Apto, Sala, Bloco..."
                      className="bg-muted border-border/50"
                  />
                </div>
              </div>

              {/* Endereço — linha 3 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2 col-span-1">
                  <Label>Bairro</Label>
                  <Input
                      value={form.bairro}
                      onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))}
                      className="bg-muted border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input
                      value={form.cidade}
                      onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))}
                      className="bg-muted border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>UF</Label>
                  <Input
                      value={form.uf}
                      onChange={e => setForm(f => ({ ...f, uf: e.target.value.toUpperCase().slice(0, 2) }))}
                      placeholder="SP"
                      maxLength={2}
                      className="bg-muted border-border/50 font-mono uppercase"
                  />
                </div>
              </div>

              <Button
                  type="submit"
                  className="w-full gradient-primary border-0 text-white"
                  disabled={isPending}
              >
                {isPending
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</>
                    : editing ? 'Salvar alterações' : 'Cadastrar empresa'
                }
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
  );
}