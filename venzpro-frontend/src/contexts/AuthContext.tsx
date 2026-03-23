import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Organization, OrganizationType, AuthState } from '@/types';
import { authApi, type RegisterPayload } from '@/api/endpoints';

const AuthContext = createContext<AuthState | undefined>(undefined);

const TOKEN_KEY = 'venzpro_token';
const AUTH_KEY  = 'venzpro_auth';

interface Stored { user: User; organization: Organization }

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]                   = useState<User | null>(null);
  const [organization, setOrganization]   = useState<Organization | null>(null);

  useEffect(() => {
    const token  = localStorage.getItem(TOKEN_KEY);
    const stored = localStorage.getItem(AUTH_KEY);
    if (token && stored) {
      try {
        const parsed: Stored = JSON.parse(stored);
        setUser(parsed.user);
        setOrganization(parsed.organization);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(AUTH_KEY);
      }
    }
  }, []);

  const persist = (token: string, u: User, o: Organization) => {
    localStorage.setItem(TOKEN_KEY, token);
    // NÃO salva AUTH_KEY — dados ficam apenas em memória (state React)
    setUser(u);
    setOrganization(o);
  };

// Para restaurar sessão após reload, decodifique o JWT:
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    try {
      // Decodifica o payload do JWT (sem verificar assinatura — ok no frontend)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);

      if (payload.exp < now) {
        // Token expirado — limpa e não restaura
        localStorage.removeItem(TOKEN_KEY);
        return;
      }

      // Revalida com o backend para garantir que token ainda é válido
      api.get('/users/me').then(res => {
        setUser(res.data.user);
        setOrganization(res.data.organization);
      }).catch(() => {
        localStorage.removeItem(TOKEN_KEY);
      });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, []);

  const login = useCallback(async (email: string, senha: string) => {
    const res = await authApi.login({ email, senha });
    const u: User = {
      id: res.user.id, nome: res.user.nome, email: res.user.email,
      role: res.user.role as User['role'], organizationId: res.organization.id,
    };
    const o: Organization = {
      id: res.organization.id, nome: res.organization.nome,
      tipo: res.organization.tipo as OrganizationType,
    };
    persist(res.token, u, o);
  }, []);

  const register = useCallback(async (
    nome: string, email: string, senha: string,
    tipo: OrganizationType, nomeOrganizacao?: string,
  ) => {
    const payload: RegisterPayload = {
      nome, email, senha,
      nomeOrganizacao: nomeOrganizacao ?? `Organização de ${nome}`,
      tipoOrganizacao: tipo,
    };
    const res = await authApi.register(payload);
    const u: User = {
      id: res.user.id, nome: res.user.nome, email: res.user.email,
      role: res.user.role as User['role'], organizationId: res.organization.id,
    };
    const o: Organization = {
      id: res.organization.id, nome: res.organization.nome,
      tipo: res.organization.tipo as OrganizationType,
    };
    persist(res.token, u, o);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(AUTH_KEY);
    setUser(null);
    setOrganization(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, organization, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
