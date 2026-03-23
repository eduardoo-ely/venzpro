import React, { useState } from "react";
import { useOrders } from "@/hooks/useOrders";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, FileText, Eye, Loader2, Filter } from "lucide-react";
import { NovoPedidoSheet } from "@/components/NovoPedidoSheet";

const getStatusColor = (status: string) => {
  switch (status) {
    case "ORCAMENTO": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "ENVIADO": return "bg-blue-100 text-blue-800 border-blue-200";
    case "APROVADO": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "CONCLUIDO": return "bg-purple-100 text-purple-800 border-purple-200";
    case "REJEITADO": return "bg-red-100 text-red-800 border-red-200";
    case "CANCELADO": return "bg-gray-100 text-gray-800 border-gray-200";
    default: return "bg-gray-100 text-gray-800";
  }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatDate = (dateString: string) => {
  if (!dateString) return "-";
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(new Date(dateString));
};

export default function PedidosPage() {
  const { orders, isLoading } = useOrders();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("TODOS");

  // Estado para controlar a abertura do Carrinho
  const [isNovoPedidoOpen, setIsNovoPedidoOpen] = useState(false);

  const filteredOrders = orders?.filter(order => {
    const matchesSearch =
        order.customer?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "TODOS" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  }) || [];

  return (
      <div className="space-y-6">
        <PageHeader
            title="Central de Pedidos"
            description="Acompanhe orçamentos, vendas enviadas e histórico de faturação."
            action={
              <Button className="gap-2" onClick={() => setIsNovoPedidoOpen(true)}>
                <Plus className="h-4 w-4" /> Novo Pedido
              </Button>
            }
        />

        <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
                placeholder="Pesquisar por cliente ou código do pedido..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-64 flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Filtrar por Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os Status</SelectItem>
                <SelectItem value="ORCAMENTO">Orçamento</SelectItem>
                <SelectItem value="ENVIADO">Enviado ao Cliente</SelectItem>
                <SelectItem value="APROVADO">Aprovado</SelectItem>
                <SelectItem value="CONCLUIDO">Concluído / Faturado</SelectItem>
                <SelectItem value="REJEITADO">Rejeitado</SelectItem>
                <SelectItem value="CANCELADO">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Data & Código</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      A carregar pedidos...
                    </TableCell>
                  </TableRow>
              ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Nenhum pedido encontrado com estes filtros.
                    </TableCell>
                  </TableRow>
              ) : (
                  filteredOrders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="font-medium text-gray-900">
                            {formatDate(order.createdAt)}
                          </div>
                          <div className="text-xs text-gray-500 uppercase">
                            #{order.id.substring(0, 8)}
                          </div>
                        </TableCell>

                        <TableCell>
                          <p className="font-medium text-gray-900">{order.customer?.nome || "Cliente Removido"}</p>
                          <p className="text-xs text-gray-500">{order.company?.nome || "Empresa Padrão"}</p>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm text-gray-700">{order.user?.nome || "-"}</div>
                        </TableCell>

                        <TableCell>
                          <div className="font-bold text-gray-900">
                            {formatCurrency(order.valorTotal)}
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge className={`font-semibold ${getStatusColor(order.status)}`}>
                            {order.status}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" size="icon" title="Ver Orçamento em PDF">
                            <FileText className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </div>

        <NovoPedidoSheet
            isOpen={isNovoPedidoOpen}
            onClose={() => setIsNovoPedidoOpen(false)}
        />

      </div>
  );
}