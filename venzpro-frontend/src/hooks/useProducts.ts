import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi, type ProductPayload } from '@/api/endpoints';
import { notify } from '@/lib/toast';
import { getErrorMessage } from '@/api/api';

const KEY = ['products'] as const;

// ── Constantes de validação do cliente ───────────────────────────────────────
const CSV_MAX_BYTES   = 10 * 1024 * 1024; // 10 MB
const CSV_EXTENSAO    = '.csv';

// ── Mensagens de erro de importação ──────────────────────────────────────────
const ERROS_IMPORTACAO: Record<string, string> = {
  FORMATO_INVALIDO: 'Formato inválido. Selecione um arquivo .csv.',
  TAMANHO_EXCEDIDO: `Arquivo muito grande. O limite é 10 MB.`,
  VAZIO:            'O arquivo está vazio.',
};

export function useProducts(initialPage = 0, pageSize = 20) {
  const qc = useQueryClient();

  // ── Estado de paginação e busca ───────────────────────────────────────────
  const [page,  setPage]  = useState(initialPage);
  const [termo, setTermo] = useState('');

  // ── Query paginada (lista ou busca) ───────────────────────────────────────
  const query = useQuery({
    queryKey: [...KEY, page, pageSize, termo],
    queryFn:  () =>
        termo.trim()
            ? productsApi.search(termo.trim(), page, pageSize)
            : productsApi.list(page, pageSize),
    placeholderData: (prev) => prev,
  });

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const create = useMutation({
    mutationFn: (d: ProductPayload) => productsApi.create(d),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: KEY });
      notify.success('Produto criado!');
    },
    onError: (e) => notify.apiError(e, 'Erro ao criar produto.'),
  });

  const update = useMutation({
    mutationFn: ({ id, ...d }: { id: string } & ProductPayload) =>
        productsApi.update(id, d),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: KEY });
      notify.success('Produto atualizado!');
    },
    onError: (e) => notify.apiError(e, 'Erro ao atualizar produto.'),
  });

  const patchPrice = useMutation({
    mutationFn: ({ id, novoPreco }: { id: string; novoPreco: number }) =>
        productsApi.patchPrice(id, novoPreco),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      notify.success('Preço atualizado!');
    },
    onError: (e) => notify.apiError(e, 'Erro ao atualizar preço.'),
  });

  const remove = useMutation({
    mutationFn: productsApi.remove,
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: KEY });
      notify.success('Produto desativado.');
    },
    onError: (e) => notify.apiError(e, 'Erro ao desativar produto.'),
  });

  // ── Importação CSV ────────────────────────────────────────────────────────
  const importCsv = useMutation({
    mutationFn: async (file: File) => {
      // Validação 1: extensão
      if (!file.name.toLowerCase().endsWith(CSV_EXTENSAO)) {
        throw new Error(ERROS_IMPORTACAO.FORMATO_INVALIDO);
      }

      // Validação 2: arquivo vazio
      if (file.size === 0) {
        throw new Error(ERROS_IMPORTACAO.VAZIO);
      }

      // Validação 3: tamanho máximo
      if (file.size > CSV_MAX_BYTES) {
        throw new Error(ERROS_IMPORTACAO.TAMANHO_EXCEDIDO);
      }

      return productsApi.importCsv(file);
    },
    onSuccess: () => {
      notify.info(
          'Importação iniciada! O catálogo será atualizado em alguns instantes. ' +
          'Recarregue a página para ver os novos produtos.'
      );
    },
    onError: (error: unknown) => {
      if (error instanceof Error && Object.values(ERROS_IMPORTACAO).includes(error.message)) {
        notify.error(error.message);
      } else {
        notify.apiError(error, 'Erro ao importar arquivo. Verifique o formato e tente novamente.');
      }
    },
  });

  // ── Exportação Excel ──────────────────────────────────────────────────────

  const exportExcel = useMutation({
    mutationFn: productsApi.exportExcel,
    onSuccess: (blob) => {
      const url      = URL.createObjectURL(blob);
      const link     = document.createElement('a');
      link.href      = url;
      link.download  = `catalogo_produtos_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      notify.success('Exportação concluída!');
    },
    onError: (e) => notify.apiError(e, 'Erro ao exportar catálogo.'),
  });

  // ── Helpers de navegação ──────────────────────────────────────────────────

  const proximaPagina = () => {
    const total = query.data?.totalPages ?? 1;
    if (page < total - 1) setPage(p => p + 1);
  };

  const paginaAnterior = () => {
    if (page > 0) setPage(p => p - 1);
  };

  /** Atualiza o termo e reseta para a página 0 */
  const buscar = (novoTermo: string) => {
    setTermo(novoTermo);
    setPage(0);
  };

  return {
    // dados
    products:      query.data?.content    ?? [],
    totalElements: query.data?.totalElements ?? 0,
    totalPages:    query.data?.totalPages    ?? 1,
    page,
    pageSize,
    termo,

    // estado
    isLoading:  query.isLoading,
    isFetching: query.isFetching,
    isError:    query.isError,

    // ações
    buscar,
    proximaPagina,
    paginaAnterior,
    create,
    update,
    patchPrice,
    remove,
    importCsv,
    exportExcel,
  };
}