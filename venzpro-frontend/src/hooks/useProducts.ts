import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/api/endpoints';

const KEY = ['products'] as const;

export function useProducts() {
  const query = useQuery({
    queryKey: KEY,
    queryFn: productsApi.list,
  });

  return {
    products: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
