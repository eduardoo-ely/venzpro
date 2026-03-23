import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  customersApi,
  type CustomerPayload,
  type CustomerStatusPayload,
  type CustomerOwnerPayload,
} from '@/api/endpoints';
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

  const updateStatus = useMutation({
    mutationFn: ({ id, ...d }: { id: string } & CustomerStatusPayload) =>
        customersApi.updateStatus(id, d),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: KEY });
      notify.success(vars.status === 'APROVADO' ? 'Cliente aprovado!' : 'Cliente rejeitado.');
    },
    onError: (e) => notify.apiError(e, 'Erro ao alterar status do cliente.'),
  });

  const updateOwner = useMutation({
    mutationFn: ({ id, ...d }: { id: string } & CustomerOwnerPayload) =>
        customersApi.updateOwner(id, d),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: KEY });
      notify.success(
          vars.ownerId ? 'Responsável atribuído com sucesso!' : 'Responsável removido da carteira.'
      );
    },
    onError: (e) => notify.apiError(e, 'Erro ao atribuir responsável.'),
  });

  const remove = useMutation({
    mutationFn: customersApi.remove,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: KEY }); notify.success('Cliente removido.'); },
    onError:    (e) => notify.apiError(e, 'Erro ao remover cliente.'),
  });

  return {
    customers:    query.data ?? [],
    isLoading:    query.isLoading,
    isError:      query.isError,
    create,
    update,
    updateStatus,
    updateOwner,
    remove,
  };
}