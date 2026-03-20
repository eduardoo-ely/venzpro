/**
 * Helper de notificações usando sonner (já instalado no projeto Lovable).
 * Importar este módulo em hooks e páginas em vez de chamar toast diretamente —
 * assim é fácil trocar a lib futuramente sem tocar nos hooks.
 */
import { toast } from 'sonner';
import { getErrorMessage } from '@/api/api';

export const notify = {
  success: (msg: string)          => toast.success(msg),
  error:   (msg: string)          => toast.error(msg),
  info:    (msg: string)          => toast.info(msg),

  /** Extrai a mensagem de erro do axios e exibe como toast */
  apiError: (error: unknown, fallback?: string) =>
    toast.error(getErrorMessage(error, fallback)),
};
