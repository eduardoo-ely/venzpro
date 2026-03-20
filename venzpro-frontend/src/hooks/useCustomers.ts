import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi, type CustomerPayload } from '@/api/endpoints';
import { notify } from '@/lib/toast';

const KEY = ['customers'] as const;

export function useCustomers() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn:  customersApi.list,
  });

  const create = useMutation({
    mutationFn: (d: CustomerPayload) => customersApi.create(d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: KEY }); notify.success('Cliente criado!'); },
    onError:    (e) => notify.apiError(e, 'Erro ao criar cliente.'),
  });

  const update = useMutation({
    mutationFn: ({ id, ...d }: { id: string } & CustomerPayload) => customersApi.update(id, d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: KEY }); notify.success('Cliente atualizado!'); },
    onError:    (e) => notify.apiError(e, 'Erro ao atualizar cliente.'),
  });

  const remove = useMutation({
    mutationFn: customersApi.remove,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: KEY }); notify.success('Cliente removido.'); },
    onError:    (e) => notify.apiError(e, 'Erro ao remover cliente.'),
  });

  return {
    customers:  query.data ?? [],
    isLoading:  query.isLoading,
    isError:    query.isError,
    create,
    update,
    remove,
  };
}
