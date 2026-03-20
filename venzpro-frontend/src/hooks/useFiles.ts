import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { filesApi, type FilePayload } from '@/api/endpoints';
import { notify } from '@/lib/toast';

const KEY = ['files'] as const;

export function useFiles() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn:  filesApi.list,
  });

  const create = useMutation({
    mutationFn: (d: FilePayload) => filesApi.create(d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: KEY }); notify.success('Arquivo adicionado!'); },
    onError:    (e) => notify.apiError(e, 'Erro ao adicionar arquivo.'),
  });

  const remove = useMutation({
    mutationFn: filesApi.remove,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: KEY }); notify.success('Arquivo removido.'); },
    onError:    (e) => notify.apiError(e, 'Erro ao remover arquivo.'),
  });

  return {
    files:      query.data ?? [],
    isLoading:  query.isLoading,
    isError:    query.isError,
    create,
    remove,
  };
}
