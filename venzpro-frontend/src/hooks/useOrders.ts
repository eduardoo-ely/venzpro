import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi, type OrderPayload } from '@/api/endpoints';
import { notify } from '@/lib/toast';
import type { OrderStatus } from '@/types';

const KEY = ['orders'] as const;

export function useOrders(statusFilter?: OrderStatus) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: statusFilter ? [...KEY, statusFilter] : KEY,
    queryFn:  () => ordersApi.list(statusFilter),
  });

  const create = useMutation({
    mutationFn: (d: OrderPayload) => ordersApi.create(d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: KEY }); notify.success('Pedido criado!'); },
    onError:    (e) => notify.apiError(e, 'Erro ao criar pedido.'),
  });

  const update = useMutation({
    mutationFn: ({ id, ...d }: { id: string } & OrderPayload) => ordersApi.update(id, d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: KEY }); notify.success('Pedido atualizado!'); },
    onError:    (e) => notify.apiError(e, 'Erro ao atualizar pedido.'),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => ordersApi.updateStatus(id, status),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: KEY }); notify.success('Status atualizado!'); },
    onError:    (e) => notify.apiError(e, 'Erro ao atualizar status.'),
  });

  const remove = useMutation({
    mutationFn: ordersApi.remove,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: KEY }); notify.success('Pedido removido.'); },
    onError:    (e) => notify.apiError(e, 'Erro ao remover pedido.'),
  });

  return {
    orders:     query.data ?? [],
    isLoading:  query.isLoading,
    isError:    query.isError,
    create,
    update,
    updateStatus,
    remove,
  };
}
