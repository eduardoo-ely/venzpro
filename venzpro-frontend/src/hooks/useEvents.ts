import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi, type EventPayload } from '@/api/endpoints';
import { notify } from '@/lib/toast';

const KEY = ['events'] as const;

export function useEvents() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn:  eventsApi.list,
  });

  const create = useMutation({
    mutationFn: (payload) => eventsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      notify.success('Evento criado!');
    },
  });

  const update = useMutation({
    mutationFn: ({ id, ...d }: { id: string } & EventPayload) => eventsApi.update(id, d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: KEY }); notify.success('Evento atualizado!'); },
    onError:    (e) => notify.apiError(e, 'Erro ao atualizar evento.'),
  });

  const remove = useMutation({
    mutationFn: eventsApi.remove,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: KEY }); notify.success('Evento removido.'); },
    onError:    (e) => notify.apiError(e, 'Erro ao remover evento.'),
  });

  return {
    events: Array.isArray(query.data) ? query.data : (query.data?.content ?? []),
    isLoading:  query.isLoading,
    isError:    query.isError,
    create,
    update,
    remove,
  };
}
