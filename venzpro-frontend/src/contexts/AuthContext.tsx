import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '@/api/endpoints';
import type { AuthResponse } from '@/api/endpoints';

interface AuthUser {
  id: string;
  nome: string;
  email: string;
  role: string;
  organizationId: string;
  podeAprovar: boolean;
  podeExportar: boolean;
  podeVerDashboard: boolean;
}

interface AuthOrganization {
  id: string;
  nome: string;
  tipo: string;
}

interface AuthContextData {
  user: AuthUser | null;
  organization: AuthOrganization | null;
  token: string | null;
  login: (email: string, senha: string) => Promise<void>;
  register: (
    nome: string,
    email: string,
    senha: string,
    tipoOrganizacao: 'REPRESENTANTE' | 'EMPRESA',
    nomeOrganizacao?: string
  ) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

function mapResponse(data: AuthResponse): { user: AuthUser; organization: AuthOrganization } {
  return {
    user: {
      id: data.user.id,
      nome: data.user.nome,
      email: data.user.email,
      role: data.user.role,
      organizationId: data.user.organizationId,
      // campos de permissão — virão undefined na resposta de auth,
      // são atualizados pelo endpoint /users/me quando necessário
      podeAprovar: (data.user as any).podeAprovar ?? false,
      podeExportar: (data.user as any).podeExportar ?? false,
      podeVerDashboard: (data.user as any).podeVerDashboard ?? false,
    },
    organization: {
      id: data.organization.id,
      nome: data.organization.nome,
      tipo: data.organization.tipo,
    },
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organization, setOrganization] = useState<AuthOrganization | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('@venzpro:token');
      const storedUser = localStorage.getItem('@venzpro:user');
      const storedOrg = localStorage.getItem('@venzpro:org');

      if (storedToken && storedUser && storedOrg) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setOrganization(JSON.parse(storedOrg));
      }
    } catch (error) {
      console.error('Erro ao recuperar sessão:', error);
      localStorage.removeItem('@venzpro:token');
      localStorage.removeItem('@venzpro:user');
      localStorage.removeItem('@venzpro:org');
    } finally {
      setLoading(false);
    }
  }, []);

  function persist(data: AuthResponse) {
    const { user: u, organization: o } = mapResponse(data);
    setToken(data.token);
    setUser(u);
    setOrganization(o);
    localStorage.setItem('@venzpro:token', data.token);
    localStorage.setItem('@venzpro:user', JSON.stringify(u));
    localStorage.setItem('@venzpro:org', JSON.stringify(o));
  }

  async function login(email: string, senha: string) {
    const data = await authApi.login({ email, senha });
    persist(data);
  }

  async function register(
    nome: string,
    email: string,
    senha: string,
    tipoOrganizacao: 'REPRESENTANTE' | 'EMPRESA',
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Carregando sistema...
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{ user, organization, token, login, register, logout, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
