import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Organization, OrganizationType, AuthState } from '@/types';

const AuthContext = createContext<AuthState | undefined>(undefined);

const STORAGE_KEY = 'hub_comercial_auth';

interface StoredAuth {
  user: User;
  organization: Organization;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: StoredAuth = JSON.parse(stored);
        setUser(parsed.user);
        setOrganization(parsed.organization);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const login = useCallback(async (email: string, _senha: string) => {
    // Mock login
    const mockUser: User = {
      id: 'user-1',
      nome: email.split('@')[0],
      email,
      role: 'ADMIN',
      organizationId: 'org-1',
    };
    const mockOrg: Organization = {
      id: 'org-1',
      nome: 'Minha Organização',
      tipo: 'REPRESENTANTE',
    };
    setUser(mockUser);
    setOrganization(mockOrg);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: mockUser, organization: mockOrg }));
  }, []);

  const register = useCallback(async (nome: string, email: string, _senha: string, tipo: OrganizationType) => {
    const mockUser: User = {
      id: `user-${Date.now()}`,
      nome,
      email,
      role: 'ADMIN',
      organizationId: `org-${Date.now()}`,
    };
    const mockOrg: Organization = {
      id: mockUser.organizationId,
      nome: `Org de ${nome}`,
      tipo,
    };
    setUser(mockUser);
    setOrganization(mockOrg);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: mockUser, organization: mockOrg }));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setOrganization(null);
    localStorage.removeItem(STORAGE_KEY);
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
