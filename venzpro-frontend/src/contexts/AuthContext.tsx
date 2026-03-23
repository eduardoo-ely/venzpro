import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthResponse } from '@/api/endpoints';

interface AuthContextData {
  user: AuthResponse['user'] | null;
  organization: AuthResponse['organization'] | null;
  token: string | null;
  login: (data: AuthResponse) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthResponse['user'] | null>(null);
  const [organization, setOrganization] = useState<AuthResponse['organization'] | null>(null);
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

  const login = (data: AuthResponse) => {
    setToken(data.token);
    setUser(data.user);
    setOrganization(data.organization);

    localStorage.setItem('@venzpro:token', data.token);
    localStorage.setItem('@venzpro:user', JSON.stringify(data.user));
    localStorage.setItem('@venzpro:org', JSON.stringify(data.organization));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setOrganization(null);

    localStorage.removeItem('@venzpro:token');
    localStorage.removeItem('@venzpro:user');
    localStorage.removeItem('@venzpro:org');

    window.location.href = '/login';
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Carregando sistema...</div>;
  }

  return (
      <AuthContext.Provider value={{ user, organization, token, login, logout, isAuthenticated: !!token }}>
        {children}
      </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);