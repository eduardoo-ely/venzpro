import { toast } from 'sonner';
import { getErrorMessage } from '@/api/api';

export const notify = {
  success: (msg: string) => toast.success(msg),
  error:   (msg: string) => toast.error(msg),
  info:    (msg: string) => toast.info(msg),

  /** Extrai a mensagem do erro axios/Error e exibe como toast */
  apiError: (error: unknown, fallback?: string) =>
    toast.error(getErrorMessage(error, fallback)),
};
