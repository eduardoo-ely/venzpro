import React, { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCustomers } from "@/hooks/useCustomers";
import { useCompanies } from "@/hooks/useCompanies";
import { useProducts } from "@/hooks/useProducts";
import { useOrders } from "@/hooks/useOrders";
import { Product } from "@/types";
import { Search, ShoppingCart, Plus, Minus, Trash2, Loader2, PackageOpen } from "lucide-react";
import { toast } from "sonner";

interface NovoPedidoSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

interface CartItem {
    product: Product;
    quantidade: number;
}

export function NovoPedidoSheet({ isOpen, onClose }: NovoPedidoSheetProps) {
    // Hooks da API Real
    const { customers, isLoading: isLoadingCustomers } = useCustomers();
    const { companies, isLoading: isLoadingCompanies } = useCompanies();
    const { products, isLoading: isLoadingProducts } = useProducts();
    const { createOrder } = useOrders();

    // Estados do Formulário
    const [customerId, setCustomerId] = useState<string>("");
    const [companyId, setCompanyId] = useState<string>("");
    const [descricao, setDescricao] = useState<string>("");
    const [searchTerm, setSearchTerm] = useState<string>("");

    // Estado do Carrinho
    const [cart, setCart] = useState<CartItem[]>([]);

    // Filtra apenas clientes APROVADOS (Regra de Negócio §12.6.1)
    const clientesAprovados = useMemo(() => {
        return customers?.filter(c => c.status === "APROVADO") || [];
    }, [customers]);

    // Lista de Produtos recebida da API (lidando com a paginação se existir)
    // O seu backend devolve { content: [...] } se for paginado, ajustamos aqui:
    const listaProdutos: Product[] = Array.isArray(products) ? products : (products as any)?.content || [];

    const filteredProducts = useMemo(() => {
        if (!searchTerm) return listaProdutos;
        return listaProdutos.filter(p =>
            p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.codigoSku?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, listaProdutos]);

    // Funções do Carrinho
    const addToCart = (product: Product) => {
        if (!product.precoBase) {
            toast.error("Este produto não tem preço definido.");
            return;
        }
        setCart(prev => {
            const exists = prev.find(item => item.product.id === product.id);
            if (exists) {
                return prev.map(item => item.product.id === product.id ? { ...item, quantidade: item.quantidade + 1 } : item);
            }
            return [...prev, { product, quantidade: 1 }];
        });
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const novaQtd = Math.max(0, item.quantidade + delta);
                return { ...item, quantidade: novaQtd };
            }
            return item;
        }).filter(item => item.quantidade > 0));
    };

    const clearCart = () => {
        setCart([]);
        setCustomerId("");
        setCompanyId("");
        setDescricao("");
        setSearchTerm("");
    };

    const handleClose = () => {
        clearCart();
        onClose();
    };

    // Cálculos
    const valorTotal = cart.reduce((acc, item) => acc + (item.product.precoBase * item.quantidade), 0);
    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    // Submissão do Pedido
    const handleSubmit = () => {
        if (!customerId) return toast.error("Selecione um Cliente.");
        if (!companyId) return toast.error("Selecione uma Empresa (Fornecedor).");
        if (cart.length === 0) return toast.error("O carrinho está vazio.");

        const payload = {
            customerId,
            companyId,
            descricao,
            items: cart.map(item => ({
                productId: item.product.id,
                quantidade: item.quantidade
            }))
        };

        createOrder.mutate(payload as any, {
            onSuccess: () => {
                toast.success("Orçamento gerado com sucesso!");
                handleClose();
            }
        });
    };

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <SheetContent className="w-full sm:max-w-4xl p-0 flex flex-col h-full bg-gray-50">

                <SheetHeader className="p-6 bg-white border-b shrink-0">
                    <SheetTitle className="text-2xl flex items-center gap-2">
                        <ShoppingCart className="h-6 w-6 text-blue-600" />
                        Ponto de Venda (Novo Orçamento)
                    </SheetTitle>
                    <SheetDescription>
                        Selecione o cliente, adicione os produtos e gere o orçamento na hora.
                    </SheetDescription>
                </SheetHeader>

                {/* Layout Dividido (2 Colunas) */}
                <div className="flex flex-1 overflow-hidden flex-col md:flex-row">

                    {/* Coluna Esquerda: Catálogo e Seleção */}
                    <div className="flex-1 flex flex-col border-r bg-white w-full">
                        <div className="p-6 space-y-4 shrink-0 border-b">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Cliente <span className="text-red-500">*</span></Label>
                                    <Select value={customerId} onValueChange={setCustomerId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={isLoadingCustomers ? "A carregar..." : "Selecione o cliente"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {clientesAprovados.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                                            ))}
                                            {clientesAprovados.length === 0 && <SelectItem value="vazio" disabled>Nenhum cliente aprovado</SelectItem>}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Empresa Fornecedora <span className="text-red-500">*</span></Label>
                                    <Select value={companyId} onValueChange={setCompanyId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={isLoadingCompanies ? "A carregar..." : "Selecione a empresa"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {companies?.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    placeholder="Pesquisar produtos no catálogo..."
                                    className="pl-9 bg-gray-50"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <ScrollArea className="flex-1 p-6">
                            {isLoadingProducts ? (
                                <div className="flex items-center justify-center h-32 text-gray-500"><Loader2 className="h-6 w-6 animate-spin mr-2"/> A carregar catálogo...</div>
                            ) : filteredProducts.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">
                                    <PackageOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                    Nenhum produto encontrado.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {filteredProducts.map(produto => (
                                        <div key={produto.id} className="border rounded-lg p-4 flex flex-col justify-between bg-white hover:border-blue-400 transition-colors shadow-sm">
                                            <div>
                                                <div className="text-xs text-gray-500 font-medium mb-1">SKU: {produto.codigoSku || "S/N"}</div>
                                                <h4 className="font-semibold text-gray-900 leading-tight">{produto.nome}</h4>
                                                <div className="text-lg font-bold text-blue-600 mt-2">{formatCurrency(produto.precoBase || 0)}</div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="w-full mt-4 bg-blue-50 text-blue-700 hover:bg-blue-100"
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

                    {/* Coluna Direita: O Carrinho */}
                    <div className="w-full md:w-96 flex flex-col bg-gray-50">
                        <div className="p-4 bg-gray-100 border-b font-semibold text-gray-700 flex justify-between items-center shrink-0">
                            Resumo do Pedido
                            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">{cart.length} itens</span>
                        </div>

                        <ScrollArea className="flex-1 p-4">
                            {cart.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 flex flex-col items-center">
                                    <ShoppingCart className="h-12 w-12 mb-2 opacity-20" />
                                    <p>O seu carrinho está vazio.</p>
                                    <p className="text-sm mt-1">Clique nos produtos para adicionar.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {cart.map(item => (
                                        <div key={item.product.id} className="bg-white p-3 rounded-lg border shadow-sm flex items-center justify-between">
                                            <div className="flex-1 pr-2">
                                                <h5 className="font-medium text-sm leading-tight text-gray-900 line-clamp-2">{item.product.nome}</h5>
                                                <div className="text-blue-600 font-semibold text-sm mt-1">{formatCurrency(item.product.precoBase)}</div>
                                            </div>
                                            <div className="flex items-center gap-2 bg-gray-50 rounded-md border p-1">
                                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm" onClick={() => updateQuantity(item.product.id, -1)}>
                                                    {item.quantidade === 1 ? <Trash2 className="h-3 w-3 text-red-500" /> : <Minus className="h-3 w-3" />}
                                                </Button>
                                                <span className="text-sm font-semibold w-4 text-center">{item.quantidade}</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm" onClick={() => updateQuantity(item.product.id, 1)}>
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {cart.length > 0 && (
                                <div className="mt-6 space-y-2">
                                    <Label className="text-gray-500 text-xs uppercase font-bold">Observações Internas (Opcional)</Label>
                                    <Input
                                        placeholder="Ex: Entrega urgente..."
                                        className="bg-white text-sm"
                                        value={descricao}
                                        onChange={(e) => setDescricao(e.target.value)}
                                    />
                                </div>
                            )}
                        </ScrollArea>

                        {/* Rodapé do Carrinho (Total e Submeter) */}
                        <div className="p-6 bg-white border-t shrink-0">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-gray-600 font-medium">Valor Total:</span>
                                <span className="text-2xl font-bold text-gray-900">{formatCurrency(valorTotal)}</span>
                            </div>
                            <Button
                                className="w-full h-12 text-lg font-semibold shadow-md"
                                onClick={handleSubmit}
                                disabled={cart.length === 0 || createOrder.isPending}
                            >
                                {createOrder.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ShoppingCart className="h-5 w-5 mr-2" />}
                                Gerar Orçamento
                            </Button>
                        </div>
                    </div>
                </div>

            </SheetContent>
        </Sheet>
    );
}