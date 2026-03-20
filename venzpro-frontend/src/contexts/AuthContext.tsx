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
    localStorage.setItem(AUTH_KEY, JSON.stringify({ user: u, organization: o }));
    setUser(u);
    setOrganization(o);
  };

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
