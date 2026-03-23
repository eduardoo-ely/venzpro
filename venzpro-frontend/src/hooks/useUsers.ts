import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/endpoints';
import { notify } from '@/lib/toast';

const KEY = ['users'] as const;

export function useUsers() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn:  usersApi.list,
  });

  const updateAccess = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: import('@/api/endpoints').UpdateAccessPayload }) =>
        usersApi.updateAccess(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      notify.success('Acessos atualizados com sucesso!');
    },
    onError: (e) => notify.apiError(e, 'Erro ao atualizar acessos.'),
  });

  return {
    users: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    updateAccess,
    remove,
  };

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => usersApi.updateRole(id, role),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: KEY }); notify.success('Role atualizada!'); },
    onError:    (e) => notify.apiError(e, 'Erro ao atualizar role.'),
  });

  const remove = useMutation({
    mutationFn: usersApi.remove,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: KEY }); notify.success('Usuário removido.'); },
    onError:    (e) => notify.apiError(e, 'Erro ao remover usuário.'),
  });

  return {
    users:      query.data ?? [],
    isLoading:  query.isLoading,
    isError:    query.isError,
    updateRole,
    remove,
  };
}
