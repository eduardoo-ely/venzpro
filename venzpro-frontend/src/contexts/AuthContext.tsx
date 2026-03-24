import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, usersApi } from '@/api/endpoints';
import type { AuthResponse } from '@/api/endpoints';

// ── Tipos do contexto ─────────────────────────────────────────────────────────

interface AuthUser {
  id:                  string;
  nome:                string;
  email:               string;
  role:                string;
  organizationId:      string;
  podeAprovar:         boolean;
  podeExportar:        boolean;
  podeVerDashboard:    boolean;
  /** Flag de onboarding obrigatório (Regra 5). Persistida no banco de dados. */
  onboardingCompleted: boolean;
}

interface AuthOrganization {
  id:   string;
  nome: string;
  tipo: string;
}

interface AuthContextData {
  user:            AuthUser | null;
  organization:    AuthOrganization | null;
  token:           string | null;
  isAuthenticated: boolean;
  login:    (email: string, senha: string) => Promise<void>;
  register: (
    nome:              string,
    email:             string,
    senha:             string,
    tipoOrganizacao:   'REPRESENTANTE' | 'EMPRESA',
    nomeOrganizacao?:  string
  ) => Promise<void>;
  logout:      () => void;
  /**
   * Recarrega o perfil do usuário logado a partir do backend.
   * Usado após operações que alteram dados do próprio usuário
   * (ex: concluir onboarding, atualizar permissões).
   */
  refreshUser: () => Promise<void>;
}

// ── Contexto ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// ── Mapeamento da resposta da API ─────────────────────────────────────────────

function mapResponseToUser(data: AuthResponse): AuthUser {
  const u = data.user;
  return {
    id:                  u.id,
    nome:                u.nome,
    email:               u.email,
    role:                u.role,
    organizationId:      u.organizationId,
    podeAprovar:         (u as any).podeAprovar         ?? false,
    podeExportar:        (u as any).podeExportar        ?? false,
    podeVerDashboard:    (u as any).podeVerDashboard    ?? false,
    onboardingCompleted: (u as any).onboardingCompleted ?? false,
  };
}

function mapResponseToOrg(data: AuthResponse): AuthOrganization {
  return {
    id:   data.organization.id,
    nome: data.organization.nome,
    tipo: data.organization.tipo,
  };
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,         setUser]         = useState<AuthUser | null>(null);
  const [organization, setOrganization] = useState<AuthOrganization | null>(null);
  const [token,        setToken]        = useState<string | null>(null);
  const [loading,      setLoading]      = useState(true);

  // Restaurar sessão do localStorage na inicialização
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('@venzpro:token');
      const storedUser  = localStorage.getItem('@venzpro:user');
      const storedOrg   = localStorage.getItem('@venzpro:org');

      if (storedToken && storedUser && storedOrg) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setOrganization(JSON.parse(storedOrg));
      }
    } catch {
      // Sessão corrompida — limpa tudo
      localStorage.removeItem('@venzpro:token');
      localStorage.removeItem('@venzpro:user');
      localStorage.removeItem('@venzpro:org');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Persistência ─────────────────────────────────────────────────────────────

  function persist(data: AuthResponse) {
    const u = mapResponseToUser(data);
    const o = mapResponseToOrg(data);
    setToken(data.token);
    setUser(u);
    setOrganization(o);
    localStorage.setItem('@venzpro:token', data.token);
    localStorage.setItem('@venzpro:user', JSON.stringify(u));
    localStorage.setItem('@venzpro:org',  JSON.stringify(o));
  }

  // ── Ações de autenticação ─────────────────────────────────────────────────

  async function login(email: string, senha: string) {
    const data = await authApi.login({ email, senha });
    persist(data);
  }

  async function register(
    nome:             string,
    email:            string,
    senha:            string,
    tipoOrganizacao:  'REPRESENTANTE' | 'EMPRESA',
    nomeOrganizacao?: string
  ) {
    const data = await authApi.register({
      nome,
      email,
      senha,
      tipoOrganizacao,
      nomeOrganizacao: nomeOrganizacao ?? '',
    });
    persist(data);
  }

  function logout() {
    setToken(null);
    setUser(null);
    setOrganization(null);
    localStorage.removeItem('@venzpro:token');
    localStorage.removeItem('@venzpro:user');
    localStorage.removeItem('@venzpro:org');
    window.location.href = '/login';
  }

  /**
   * Recarrega o perfil completo do usuário logado a partir do backend
   * e atualiza o localStorage.
   *
   * Deve ser chamado após:
   * - Conclusão do onboarding (onboardingCompleted muda para true)
   * - Atualização de permissões pelo admin
   */
  const refreshUser = useCallback(async () => {
    try {
      const freshUser = await usersApi.me();
      const updated: AuthUser = {
        id:                  freshUser.id,
        nome:                freshUser.nome,
        email:               freshUser.email,
        role:                freshUser.role,
        organizationId:      user?.organizationId ?? '',
        podeAprovar:         freshUser.podeAprovar         ?? false,
        podeExportar:        freshUser.podeExportar        ?? false,
        podeVerDashboard:    freshUser.podeVerDashboard    ?? false,
        onboardingCompleted: (freshUser as any).onboardingCompleted ?? false,
      };
      setUser(updated);
      localStorage.setItem('@venzpro:user', JSON.stringify(updated));
    } catch {
      // Falha silenciosa — não desloga o usuário por erro de refresh
    }
  }, [user?.organizationId]);

  // ── Tela de carregamento inicial ──────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Carregando sistema...
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        token,
        isAuthenticated: !!token,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
