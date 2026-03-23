import React, { useState } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, Plus, FileText, Eye, Loader2, Filter } from 'lucide-react';
import { NovoPedidoSheet } from '@/components/NovoPedidoSheet';
import type { OrderStatus } from '@/types';

const STATUS_COLOR: Record<string, string> = {
  ORCAMENTO: 'status-orcamento',
  ENVIADO:   'status-enviado',
  APROVADO:  'status-aprovado',
  CONCLUIDO: 'status-concluido',
  REJEITADO: 'status-rejeitado',
  CANCELADO: 'status-cancelado',
};

const STATUS_LABEL: Record<string, string> = {
  ORCAMENTO: 'Orçamento',
  ENVIADO:   'Enviado',
  APROVADO:  'Aprovado',
  CONCLUIDO: 'Concluído',
  REJEITADO: 'Rejeitado',
  CANCELADO: 'Cancelado',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateString));
};

export default function PedidosPage() {
  const { orders, isLoading } = useOrders();
  const [searchTerm,    setSearchTerm]    = useState('');
  const [statusFilter,  setStatusFilter]  = useState<string>('TODOS');
  const [isSheetOpen,   setIsSheetOpen]   = useState(false);

  const filtered = (orders ?? []).filter(order => {
    const matchSearch =
      order.clienteNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'TODOS' || order.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central de Pedidos"
        subtitle="Acompanhe orçamentos, vendas enviadas e histórico de faturamento."
      >
        <Button className="gradient-primary border-0 text-white gap-2" onClick={() => setIsSheetOpen(true)}>
          <Plus className="h-4 w-4" /> Novo Pedido
        </Button>
      </PageHeader>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-lg border border-border/50">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por cliente ou código..."
            className="pl-9 bg-muted border-border/50"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-64 flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-muted border-border/50">
              <SelectValue placeholder="Filtrar por Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os Status</SelectItem>
              {Object.entries(STATUS_LABEL).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-card rounded-lg border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/30 hover:bg-transparent">
              <TableHead className="text-xs text-muted-foreground">Data / Código</TableHead>
              <TableHead className="text-xs text-muted-foreground">Cliente</TableHead>
              <TableHead className="text-xs text-muted-foreground">Vendedor</TableHead>
              <TableHead className="text-xs text-muted-foreground">Valor Total</TableHead>
              <TableHead className="text-xs text-muted-foreground">Status</TableHead>
              <TableHead className="text-xs text-muted-foreground text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Carregando pedidos...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                  Nenhum pedido encontrado com estes filtros.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(order => (
                <TableRow key={order.id} className="border-border/20 hover:bg-primary/5 transition-colors">
                  <TableCell>
                    <div className="font-medium text-sm">{formatDate(order.createdAt)}</div>
                    <div className="text-xs text-muted-foreground font-mono uppercase">
                      #{order.id.substring(0, 8)}
                    </div>
                  </TableCell>

                  <TableCell>
                    <p className="font-medium text-sm">{order.clienteNome ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{order.empresaNome ?? '—'}</p>
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground">
                    {order.vendedorNome ?? '—'}
                  </TableCell>

                  <TableCell className="font-bold">
                    {formatCurrency(order.valorTotal)}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`${STATUS_COLOR[order.status] ?? ''} text-[10px] font-semibold`}
                    >
                      {STATUS_LABEL[order.status] ?? order.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" title="Ver PDF">
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" /> Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <NovoPedidoSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} />
    </div>
  );
}
