import { useRef, useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useCompanies } from '@/hooks/useCompanies';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Plus, Search, Upload, Download, Pencil, Trash2,
    DollarSign, Package, ChevronLeft, ChevronRight,
    Loader2,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { motion } from 'framer-motion';
import type { Product } from '@/types';
import type { ProductPayload } from '@/api/endpoints';

// ── Enum de unidades (espelha o backend) ─────────────────────────────────────

const UNIDADES: { value: string; label: string }[] = [
    { value: 'UN',  label: 'UN — Unidade'        },
    { value: 'KG',  label: 'KG — Quilograma'      },
    { value: 'CX',  label: 'CX — Caixa'           },
    { value: 'L',   label: 'L — Litro'            },
    { value: 'M',   label: 'M — Metro linear'     },
    { value: 'M2',  label: 'M² — Metro quadrado'  },
    { value: 'M3',  label: 'M³ — Metro cúbico'    },
    { value: 'PC',  label: 'PC — Peça'            },
    { value: 'PAR', label: 'PAR — Par'            },
    { value: 'HR',  label: 'HR — Hora'            },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatarPreco(preco?: number | null): string {
    if (preco == null) return '-';
    return preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Tipos internos ────────────────────────────────────────────────────────────

type Form = {
    nome:       string;
    descricao:  string;
    precoBase:  string;
    unidade:    string;
    companyId:  string;
    codigoSku:  string;
};

type PatchPriceState = {
    open:      boolean;
    productId: string | null;
    novoPreco: string;
    nomeProduto: string;
};

const emptyForm: Form = {
    nome: '', descricao: '', precoBase: '', unidade: 'UN', companyId: '', codigoSku: '',
};

const SEM_EMPRESA = '__global__';

// ── Componente principal ──────────────────────────────────────────────────────

export default function ProdutosPage() {
    const {
        products, totalElements, totalPages, page, isLoading, isFetching,
        buscar, proximaPagina, paginaAnterior,
        create, update, patchPrice, remove, importCsv, exportExcel,
    } = useProducts();

    const { companies } = useCompanies();
    const { user }      = useAuth();

    const [open,       setOpen]       = useState(false);
    const [editing,    setEditing]    = useState<Product | null>(null);
    const [form,       setForm]       = useState<Form>(emptyForm);
    const [searchTerm, setSearchTerm] = useState('');
    const [patchState, setPatchState] = useState<PatchPriceState>({
        open: false, productId: null, novoPreco: '', nomeProduto: '',
    });

    // ref para o input de arquivo oculto
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Apenas ADMIN e GERENTE podem alterar preço (espelha @PreAuthorize do backend)
    const podeAlterarPreco = user?.role === 'ADMIN' || user?.role === 'GERENTE';

    // ── Handlers — busca ─────────────────────────────────────────────────────────

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setSearchTerm(v);
        buscar(v);
    };

    // ── Handlers — formulário ────────────────────────────────────────────────────

    const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };

    const openEdit = (p: Product) => {
        setEditing(p);
        setForm({
            nome:      p.nome,
            descricao: p.descricao ?? '',
            precoBase: p.precoBase != null ? String(p.precoBase) : '',
            unidade:   p.unidade   ?? 'UN',
            companyId: p.companyId ?? SEM_EMPRESA,
            codigoSku: p.codigoSku ?? '',
        });
        setOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload: ProductPayload = {
            nome:       form.nome,
            descricao:  form.descricao  || undefined,
            precoBase:  parseFloat(form.precoBase.replace(',', '.')),
            unidade:    form.unidade,
            companyId:  form.companyId && form.companyId !== SEM_EMPRESA ? form.companyId : undefined,
            codigoSku:  form.codigoSku || undefined,
        };
        if (editing) await update.mutateAsync({ id: editing.id, ...payload });
        else         await create.mutateAsync(payload);
        setOpen(false);
    };

    // ── Handlers — preço ──────────────────────────────────────────────────────────

    const abrirPatchPrice = (p: Product) =>
        setPatchState({
            open: true, productId: p.id,
            novoPreco:   p.precoBase != null ? String(p.precoBase) : '',
            nomeProduto: p.nome,
        });

    const confirmarPatchPrice = () => {
        if (!patchState.productId) return;
        const valor = parseFloat(patchState.novoPreco.replace(',', '.'));
        if (isNaN(valor) || valor < 0) return;
        patchPrice.mutate({ id: patchState.productId, novoPreco: valor });
        setPatchState({ open: false, productId: null, novoPreco: '', nomeProduto: '' });
    };

    // ── Handlers — importação ─────────────────────────────────────────────────────

    const handleImportClick = () => fileInputRef.current?.click();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        importCsv.mutate(file);
        // reseta o input para permitir selecionar o mesmo arquivo novamente
        e.target.value = '';
    };

    const isPending = create.isPending || update.isPending;

    // ── JSX ───────────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            <PageHeader title="Produtos" subtitle="Gerencie o catálogo de produtos da organização">
                {/* Busca */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome ou descrição..."
                        value={searchTerm}
                        onChange={handleSearch}
                        className="pl-9 w-64 bg-muted border-border/50"
                    />
                </div>

                {/* Importar CSV */}
                <Button variant="outline" onClick={handleImportClick}
                        disabled={importCsv.isPending}
                        className="border-border/50"
                >
                    {importCsv.isPending
                        ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        : <Upload className="h-4 w-4 mr-2" />
                    }
                    Importar CSV
                </Button>

                {/* Input de arquivo oculto */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileChange}
                />

                {/* Exportar Excel */}
                <Button variant="outline" onClick={() => exportExcel.mutate()}
                        disabled={exportExcel.isPending}
                        className="border-border/50"
                >
                    {exportExcel.isPending
                        ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        : <Download className="h-4 w-4 mr-2" />
                    }
                    Exportar Excel
                </Button>

                {/* Novo produto */}
                <Button onClick={openNew} className="gradient-primary border-0 text-white shadow-lg shadow-primary/25">
                    <Plus className="h-4 w-4 mr-2" />Novo Produto
                </Button>
            </PageHeader>

            {/* Indicador de refetch (paginação / busca) */}
            {isFetching && !isLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Carregando...
                </div>
            )}

            {/* Skeleton de carregamento inicial */}
            {isLoading && (
                <Card className="border-glow bg-card">
                    <CardContent className="p-4 space-y-3">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 flex-1" />
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Empty state — sem produtos */}
            {!isLoading && products.length === 0 && (
                <EmptyState
                    icon={Package}
                    title={
                        searchTerm
                            ? 'Nenhum produto encontrado para esta busca'
                            : 'Nenhum produto cadastrado'
                    }
                    description={
                        searchTerm
                            ? 'Tente outros termos ou limpe a busca para ver todos os produtos.'
                            : 'Comece adicionando produtos ao catálogo ou importe uma planilha CSV.'
                    }
                    actionLabel={searchTerm ? undefined : 'Novo Produto'}
                    onAction={searchTerm ? undefined : openNew}
                />
            )}

            {/* Tabela de produtos */}
            {!isLoading && products.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Card className="border-glow bg-card">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-border/30 hover:bg-transparent">
                                        <TableHead className="text-xs text-muted-foreground">SKU</TableHead>
                                        <TableHead className="text-xs text-muted-foreground">Nome</TableHead>
                                        <TableHead className="text-xs text-muted-foreground">Empresa</TableHead>
                                        <TableHead className="text-xs text-muted-foreground">Preço Base</TableHead>
                                        <TableHead className="text-xs text-muted-foreground">Unidade</TableHead>
                                        <TableHead className="text-xs text-muted-foreground">Status</TableHead>
                                        <TableHead className="text-xs text-muted-foreground w-36">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {products.map(p => (
                                        <TableRow key={p.id} className="border-border/20 hover:bg-primary/5 transition-colors">
                                            {/* SKU */}
                                            <TableCell className="text-xs text-muted-foreground font-mono">
                                                {p.codigoSku ?? '—'}
                                            </TableCell>

                                            {/* Nome + descrição */}
                                            <TableCell>
                                                <div>
                                                    <p className="text-sm font-medium">{p.nome}</p>
                                                    {p.descricao && (
                                                        <p className="text-xs text-muted-foreground truncate max-w-[260px]">
                                                            {p.descricao}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Empresa */}
                                            <TableCell className="text-sm text-muted-foreground">
                                                {p.empresaNome ?? (
                                                    <span className="text-[10px] text-muted-foreground/50 italic">
                            Catálogo global
                          </span>
                                                )}
                                            </TableCell>

                                            {/* Preço */}
                                            <TableCell className="text-sm font-medium tabular-nums">
                                                {formatarPreco(p.precoBase)}
                                            </TableCell>

                                            {/* Unidade */}
                                            <TableCell>
                                                <Badge variant="secondary" className="text-[10px]">
                                                    {p.unidade ?? 'UN'}
                                                </Badge>
                                            </TableCell>

                                            {/* Status ativo/inativo */}
                                            <TableCell>
                                                <Badge variant="outline" className={
                                                    p.ativo
                                                        ? 'bg-[hsl(160_84%_39%/0.15)] text-[hsl(160,84%,39%)] border-[hsl(160_84%_39%/0.3)] text-[10px]'
                                                        : 'bg-muted text-muted-foreground border-border/30 text-[10px]'
                                                }>
                                                    {p.ativo ? 'Ativo' : 'Inativo'}
                                                </Badge>
                                            </TableCell>

                                            {/* Ações */}
                                            <TableCell>
                                                <div className="flex gap-1 items-center">
                                                    {/* Alterar preço — apenas ADMIN/GERENTE */}
                                                    {podeAlterarPreco && (
                                                        <Button variant="ghost" size="icon"
                                                                className="h-8 w-8 text-primary"
                                                                title="Alterar preço base"
                                                                onClick={() => abrirPatchPrice(p)}
                                                        >
                                                            <DollarSign className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}

                                                    {/* Editar */}
                                                    <Button variant="ghost" size="icon"
                                                            className="h-8 w-8"
                                                            title="Editar produto"
                                                            onClick={() => openEdit(p)}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>

                                                    {/* Desativar (soft-delete) */}
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon"
                                                                    className="h-8 w-8 text-destructive"
                                                                    title="Desativar produto"
                                                                    disabled={!p.ativo}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="border-glow bg-card">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Desativar produto?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    O produto <strong>{p.nome}</strong> será desativado
                                                                    e não aparecerá mais para seleção em novos pedidos.
                                                                    Pedidos existentes não são afetados.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => remove.mutate(p.id)}
                                                                    className="bg-destructive text-white"
                                                                >
                                                                    Desativar
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

                    {/* Paginação */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 px-1">
                            <p className="text-xs text-muted-foreground">
                                {totalElements} produto{totalElements !== 1 ? 's' : ''} encontrado{totalElements !== 1 ? 's' : ''}
                            </p>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" className="h-8 w-8"
                                        onClick={paginaAnterior} disabled={page === 0 || isFetching}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-xs text-muted-foreground tabular-nums">
                  {page + 1} / {totalPages}
                </span>
                                <Button variant="outline" size="icon" className="h-8 w-8"
                                        onClick={proximaPagina} disabled={page >= totalPages - 1 || isFetching}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Modal — criar / editar produto */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="border-glow bg-card max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Nome */}
                        <div className="space-y-2">
                            <Label>Nome *</Label>
                            <Input value={form.nome}
                                   onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                                   required maxLength={200} className="bg-muted border-border/50" />
                        </div>

                        {/* Descrição */}
                        <div className="space-y-2">
                            <Label>Descrição</Label>
                            <Textarea value={form.descricao}
                                      onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                                      rows={3} maxLength={5000} className="bg-muted border-border/50"
                                      placeholder="Descrição detalhada do produto (opcional)" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Preço base */}
                            <div className="space-y-2">
                                <Label>Preço base *</Label>
                                <Input
                                    value={form.precoBase}
                                    onChange={e => setForm(f => ({ ...f, precoBase: e.target.value }))}
                                    required placeholder="0,00"
                                    className="bg-muted border-border/50 font-mono"
                                />
                            </div>

                            {/* Unidade */}
                            <div className="space-y-2">
                                <Label>Unidade *</Label>
                                <Select value={form.unidade}
                                        onValueChange={v => setForm(f => ({ ...f, unidade: v }))}>
                                    <SelectTrigger className="bg-muted border-border/50">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {UNIDADES.map(u => (
                                            <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Empresa (opcional) */}
                            <div className="space-y-2">
                                <Label>Empresa</Label>
                                <Select value={form.companyId || SEM_EMPRESA}
                                        onValueChange={v => setForm(f => ({ ...f, companyId: v }))}>
                                    <SelectTrigger className="bg-muted border-border/50">
                                        <SelectValue placeholder="Catálogo global" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={SEM_EMPRESA}>
                                            <span className="text-muted-foreground italic">Catálogo global</span>
                                        </SelectItem>
                                        {companies.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-[10px] text-muted-foreground">
                                    Deixe em branco para produto disponível em toda a organização.
                                </p>
                            </div>

                            {/* SKU */}
                            <div className="space-y-2">
                                <Label>Código SKU</Label>
                                <Input value={form.codigoSku}
                                       onChange={e => setForm(f => ({ ...f, codigoSku: e.target.value }))}
                                       placeholder="Ex: PROD-001"
                                       maxLength={100}
                                       className="bg-muted border-border/50 font-mono" />
                            </div>
                        </div>

                        <Button type="submit"
                                className="w-full gradient-primary border-0 text-white"
                                disabled={isPending}>
                            {isPending ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar Produto'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal — alterar preço (apenas ADMIN/GERENTE) */}
            <Dialog open={patchState.open}
                    onOpenChange={o => setPatchState(s => ({ ...s, open: o }))}>
                <DialogContent className="border-glow bg-card max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Alterar preço base</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Produto: <strong>{patchState.nomeProduto}</strong>
                        </p>
                        <div className="space-y-2">
                            <Label>Novo preço base *</Label>
                            <Input
                                value={patchState.novoPreco}
                                onChange={e => setPatchState(s => ({ ...s, novoPreco: e.target.value }))}
                                placeholder="0,00"
                                className="bg-muted border-border/50 font-mono"
                                autoFocus
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Este preço será aplicado em novos pedidos. Pedidos já criados
                                mantêm o preço congelado no momento da criação.
                            </p>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline"
                                    onClick={() => setPatchState({ open: false, productId: null, novoPreco: '', nomeProduto: '' })}>
                                Cancelar
                            </Button>
                            <Button
                                className="gradient-primary border-0 text-white"
                                disabled={!patchState.novoPreco.trim() || patchPrice.isPending}
                                onClick={confirmarPatchPrice}
                            >
                                {patchPrice.isPending ? 'Salvando...' : 'Confirmar'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}