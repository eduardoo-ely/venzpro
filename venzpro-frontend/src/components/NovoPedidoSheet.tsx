import React, { useState, useMemo } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCustomers } from '@/hooks/useCustomers';
import { useCompanies } from '@/hooks/useCompanies';
import { useProducts } from '@/hooks/useProducts';
import { useOrders } from '@/hooks/useOrders';
import type { Product } from '@/types';
import {
  Search, ShoppingCart, Plus, Minus, Trash2, Loader2, PackageOpen,
} from 'lucide-react';
import { toast } from 'sonner';

interface NovoPedidoSheetProps {
  isOpen:  boolean;
  onClose: () => void;
}

interface CartItem {
  product:    Product;
  quantidade: number;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export function NovoPedidoSheet({ isOpen, onClose }: NovoPedidoSheetProps) {
  const { customers,  isLoading: isLoadingCustomers  } = useCustomers();
  const { companies,  isLoading: isLoadingCompanies  } = useCompanies();
  const { products,   isLoading: isLoadingProducts   } = useProducts();
  const { create: createOrder } = useOrders();

  const [customerId, setCustomerId] = useState('');
  const [companyId,  setCompanyId]  = useState('');
  const [descricao,  setDescricao]  = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart,       setCart]       = useState<CartItem[]>([]);

  const clientesAptos = useMemo(() => {
    const list = Array.isArray(customers) ? customers : (customers?.content || []);
    return list.filter(c => c.status === 'APROVADO');
  }, [customers]);

  // 2. Empresas (Extração segura para o Select)
  const safeCompanies = useMemo(() => {
    return Array.isArray(companies) ? companies : (companies?.content || []);
  }, [companies]);

  // 3. Produtos (Filtro de busca no catálogo)
  const filteredProducts = useMemo(() => {
    const list = Array.isArray(products) ? products : (products?.content || []);
    if (!searchTerm.trim()) return list;

    const lower = searchTerm.toLowerCase();
    return list.filter(
        p =>
            (p.nome || '').toLowerCase().includes(lower) ||
            (p.codigoSku || '').toLowerCase().includes(lower)
    );
  }, [searchTerm, products]);
  // ── Carrinho ──────────────────────────────────────────────────────────────

  const addToCart = (product: Product) => {
    if (!product.precoBase) {
      toast.error('Este produto não tem preço definido.');
      return;
    }
    setCart(prev => {
      const exists = prev.find(i => i.product.id === product.id);
      if (exists) {
        return prev.map(i =>
          i.product.id === product.id ? { ...i, quantidade: i.quantidade + 1 } : i
        );
      }
      return [...prev, { product, quantidade: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(i =>
          i.product.id === productId
            ? { ...i, quantidade: Math.max(0, i.quantidade + delta) }
            : i
        )
        .filter(i => i.quantidade > 0)
    );
  };

  const resetForm = () => {
    setCart([]);
    setCustomerId('');
    setCompanyId('');
    setDescricao('');
    setSearchTerm('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // ── Total ─────────────────────────────────────────────────────────────────

  const valorTotal = cart.reduce(
    (acc, item) => acc + (item.product.precoBase ?? 0) * item.quantidade,
    0
  );

  // ── Submissão ─────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!customerId) { toast.error('Selecione um Cliente.');              return; }
    if (!companyId)  { toast.error('Selecione uma Empresa Fornecedora.'); return; }
    if (cart.length === 0) { toast.error('O carrinho está vazio.');       return; }

    createOrder.mutate(
      {
        customerId,
        companyId,
        descricao: descricao || undefined,
        items: cart.map(i => ({
          productId:  i.product.id,
          quantidade: i.quantidade,
        })),
      },
      {
        onSuccess: () => {
          toast.success('Orçamento gerado com sucesso!');
          handleClose();
        },
      }
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && handleClose()}>
      <SheetContent className="w-full sm:max-w-4xl p-0 flex flex-col h-full bg-card">
        <SheetHeader className="p-6 border-b border-border/50 shrink-0">
          <SheetTitle className="text-xl flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Ponto de Venda — Novo Orçamento
          </SheetTitle>
          <SheetDescription>
            Selecione o cliente, adicione os produtos e gere o orçamento.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">

          {/* Coluna esquerda: seleção + catálogo */}
          <div className="flex-1 flex flex-col border-r border-border/30">

            {/* Cabeçalho da coluna */}
            <div className="p-5 space-y-4 shrink-0 border-b border-border/30">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Cliente <span className="text-destructive">*</span>
                  </Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger className="bg-muted border-border/50">
                      <SelectValue
                        placeholder={
                          isLoadingCustomers ? 'Carregando...' : 'Selecione o cliente'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {clientesAptos.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                      {clientesAptos.length === 0 && (
                        <SelectItem value="__vazio__" disabled>
                          Nenhum cliente aprovado com responsável
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    Empresa Fornecedora <span className="text-destructive">*</span>
                  </Label>
                  <Select value={companyId} onValueChange={setCompanyId}>
                    <SelectTrigger className="bg-muted border-border/50">
                      <SelectValue
                        placeholder={
                          isLoadingCompanies ? 'Carregando...' : 'Selecione a empresa'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {safeCompanies.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar produtos no catálogo..."
                  className="pl-9 bg-muted border-border/50"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Grid de produtos */}
            <ScrollArea className="flex-1 p-5">
              {isLoadingProducts ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando catálogo...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <PackageOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  Nenhum produto encontrado.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredProducts.map(produto => (
                    <div
                      key={produto.id}
                      className="border border-border/50 rounded-lg p-4 flex flex-col justify-between bg-muted/20 hover:border-primary/40 transition-colors"
                    >
                      <div>
                        <div className="text-xs text-muted-foreground font-mono mb-1">
                          SKU: {produto.codigoSku ?? '—'}
                        </div>
                        <h4 className="font-semibold text-sm leading-tight">{produto.nome}</h4>
                        <div className="text-base font-bold text-primary mt-2">
                          {formatCurrency(produto.precoBase ?? 0)}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-3 border-primary/30 text-primary hover:bg-primary/10"
                        onClick={() => addToCart(produto)}
                      >
                        Adicionar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Coluna direita: carrinho */}
          <div className="w-full md:w-96 flex flex-col bg-muted/10">
            <div className="p-4 border-b border-border/30 font-semibold text-sm flex justify-between items-center shrink-0">
              Resumo do Pedido
              <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
                {cart.length} iten{cart.length !== 1 ? 's' : ''}
              </span>
            </div>

            <ScrollArea className="flex-1 p-4">
              {cart.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground flex flex-col items-center">
                  <ShoppingCart className="h-12 w-12 mb-2 opacity-20" />
                  <p className="text-sm">O carrinho está vazio.</p>
                  <p className="text-xs mt-1 text-muted-foreground/60">
                    Clique nos produtos para adicionar.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => (
                    <div
                      key={item.product.id}
                      className="bg-card p-3 rounded-lg border border-border/40 flex items-center justify-between"
                    >
                      <div className="flex-1 pr-2 min-w-0">
                        <h5 className="font-medium text-sm leading-tight truncate">
                          {item.product.nome}
                        </h5>
                        <div className="text-primary font-semibold text-sm mt-0.5">
                          {formatCurrency(item.product.precoBase ?? 0)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-muted rounded-md border border-border/30 p-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.product.id, -1)}
                        >
                          {item.quantidade === 1
                            ? <Trash2 className="h-3 w-3 text-destructive" />
                            : <Minus className="h-3 w-3" />
                          }
                        </Button>
                        <span className="text-sm font-semibold w-5 text-center tabular-nums">
                          {item.quantidade}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.product.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Observações */}
                  <div className="mt-4 space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Observações (opcional)
                    </Label>
                    <Input
                      placeholder="Ex: Entrega urgente..."
                      className="bg-card border-border/50 text-sm"
                      value={descricao}
                      onChange={e => setDescricao(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </ScrollArea>

            {/* Rodapé com total */}
            <div className="p-5 border-t border-border/30 bg-card shrink-0">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-muted-foreground font-medium">Valor Total:</span>
                <span className="text-2xl font-bold">{formatCurrency(valorTotal)}</span>
              </div>
              <Button
                className="w-full h-11 gradient-primary border-0 text-white font-semibold"
                onClick={handleSubmit}
                disabled={cart.length === 0 || createOrder?.isPending}
            >
              {createOrder?.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  : <ShoppingCart className="h-4 w-4 mr-2" />
              }
              Gerar Orçamento
            </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
