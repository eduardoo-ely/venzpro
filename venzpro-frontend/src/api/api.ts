import axios, { type AxiosError } from 'axios';

// ── Instância ─────────────────────────────────────────────────────────────────

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api',
  headers: { 'Content-Type': 'application/json' },
});

// ── Injetar JWT em cada request ───────────────────────────────────────────────

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('venzpro_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Logout automático no 401 ──────────────────────────────────────────────────

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('venzpro_token');
      localStorage.removeItem('venzpro_auth');
      window.location.replace('/login');
    }
    return Promise.reject(error);
  }
);

// ── Extrator de mensagem de erro (RFC 7807 Problem Details) ───────────────────

export function getErrorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data as Record<string, unknown> | undefined;
  if (!data) return error.message || fallback;

  // RFC 7807: { detail, title }
  if (typeof data.detail === 'string') return data.detail;
  if (typeof data.title  === 'string') return data.title;
  if (typeof data.error  === 'string') return data.error;
  if (typeof data.message === 'string') return data.message;

  // Erros de validação: { campos: { field: msg } }
  if (data.campos && typeof data.campos === 'object') {
    const msgs = Object.values(data.campos as Record<string, string>);
    if (msgs.length) return msgs.join(', ');
  }

  return fallback;
}

export default api;
