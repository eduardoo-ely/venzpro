import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companiesApi } from '@/api/endpoints';
import { notify } from '@/lib/toast';

const KEY = ['companies'] as const;

export function useCompanies() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn:  companiesApi.list,
  });

  const create = useMutation({
    mutationFn: companiesApi.create,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: KEY }); notify.success('Empresa criada!'); },
    onError:    (e) => notify.apiError(e, 'Erro ao criar empresa.'),
  });

  const update = useMutation({
    mutationFn: ({ id, nome }: { id: string; nome: string }) => companiesApi.update(id, { nome }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: KEY }); notify.success('Empresa atualizada!'); },
    onError:    (e) => notify.apiError(e, 'Erro ao atualizar empresa.'),
  });

  const remove = useMutation({
    mutationFn: companiesApi.remove,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: KEY }); notify.success('Empresa removida.'); },
    onError:    (e) => notify.apiError(e, 'Erro ao remover empresa.'),
  });

  return {
    companies:  query.data ?? [],
    isLoading:  query.isLoading,
    isError:    query.isError,
    create,
    update,
    remove,
  };
}
