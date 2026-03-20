import { QueryClient } from '@tanstack/react-query';
import { notify } from '@/lib/toast';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:          60_000,   // 1 min — evita refetch excessivo
      retry:              1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error) => {
        // Erros de mutation sem onError próprio caem aqui
        notify.apiError(error);
      },
    },
  },
});
