import axios, { type AxiosError } from 'axios';

// ── Instância ─────────────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ── Injetar JWT em cada request ───────────────────────────────────────────────

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('venzpro_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Logout automático no 401 ──────────────────────────────────────────────────
// IMPORTANTE: só redireciona se NÃO estiver nas rotas públicas (/login, /register)
// Caso contrário o erro de "senha errada" nunca aparece na tela de login.

const PUBLIC_PATHS = ['/login', '/register'];

api.interceptors.response.use(
    (r) => r,
    (error: AxiosError) => {
      const isPublicPage = PUBLIC_PATHS.some(p => window.location.pathname.startsWith(p));

      if (error.response?.status === 401 && !isPublicPage) {
        localStorage.removeItem('venzpro_token');
        localStorage.removeItem('venzpro_auth');
        window.location.replace('/login');
      }

      return Promise.reject(error);
    }
);

// ── Extrator de mensagem de erro ──────────────────────────────────────────────

export function getErrorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data as Record<string, unknown> | undefined;
  if (!data) return error.message || fallback;

  if (typeof data.mensagem === 'string') {
    if (data.campos && typeof data.campos === 'object') {
      const msgs = Object.values(data.campos as Record<string, string>).slice(0, 3);
      if (msgs.length) return msgs.join(' • ');
    }
    return data.mensagem;
  }

  if (typeof data.detail  === 'string') return data.detail;
  if (typeof data.title   === 'string') return data.title;
  if (typeof data.error   === 'string') return data.error;
  if (typeof data.message === 'string') return data.message;

  return fallback;
}

export function getFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) return {};
  const data = error.response?.data as Record<string, unknown> | undefined;
  if (!data?.campos || typeof data.campos !== 'object') return {};
  return data.campos as Record<string, string>;
}

export default api;