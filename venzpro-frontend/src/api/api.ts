import axios from 'axios';

const resolveApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_URL?.trim();

  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window !== 'undefined' && window.location.port === '3000') {
    return '/api';
  }

  return 'http://localhost:8080/api';
};

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
});

// Interceptor: Injeta o Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('@venzpro:token');
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: Trata o erro 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('@venzpro:token');
      localStorage.removeItem('@venzpro:user');
      localStorage.removeItem('@venzpro:org');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Extrai a mensagem de erro de forma amigável.
 * O backend retorna { mensagem: "..." } em erros de negócio.
 */
export const getErrorMessage = (error: unknown, fallback = 'Erro na comunicação com a API'): string => {
  if (axios.isAxiosError(error)) {
    // Backend VenzPro retorna { mensagem: "..." }
    const data = error.response?.data;
    if (data?.mensagem) return data.mensagem;
    if (data?.message) return data.message;
    // Erros de validação retornam { mensagem: "...", campos: {...} }
    if (data?.campos) {
      const primeiroErro = Object.values(data.campos as Record<string, string>)[0];
      if (primeiroErro) return primeiroErro;
    }
    return error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error) || fallback;
};

export default api;
