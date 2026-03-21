export type OrganizationType = 'REPRESENTANTE' | 'EMPRESA';
export type UserRole = 'ADMIN' | 'VENDEDOR';
export type OrderStatus = 'ORCAMENTO' | 'FECHADO' | 'CANCELADO';
export type EventType = 'VISITA' | 'REUNIAO' | 'FOLLOW_UP';
export type EventStatus = 'AGENDADO' | 'CONCLUIDO' | 'CANCELADO';
export type FileType = 'PDF' | 'IMAGEM';

export interface Organization {
  id: string;
  nome: string;
  tipo: OrganizationType;
}

export interface User {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  organizationId: string;
}

export interface Company {
  id: string;
  nome: string;
  organizationId: string;
  createdAt?: string;
}

export interface Customer {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  cidade?: string;
  userId: string;
  organizationId: string;
  createdAt?: string;
}

export interface Order {
  id: string;
  // Campos retornados pelo backend (OrderResponse.java)
  customerId: string;
  clienteNome?: string;
  companyId: string;
  empresaNome?: string;
  userId: string;
  vendedorNome?: string;
  valorTotal: number;
  status: OrderStatus;
  descricao?: string;
  createdAt?: string;
  organizationId: string;
}

export interface Event {
  id: string;
  titulo: string;
  tipo: EventType;
  // Campos retornados pelo backend (EventResponse.java)
  customerId?: string;
  clienteNome?: string;
  companyId?: string;
  empresaNome?: string;
  userId?: string;
  dataInicio: string;
  dataFim?: string;
  descricao?: string;
  status: EventStatus;
  participantes?: string[];
  organizationId: string;
  createdAt?: string;
}

export interface CatalogFile {
  id: string;
  nome: string;
  url: string;
  tipo: FileType;
  // Campo retornado pelo backend (CatalogFileResponse.java)
  companyId: string;
  empresaNome?: string;
  organizationId: string;
  createdAt?: string;
}

export interface AuthState {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  login: (email: string, senha: string) => Promise<void>;
  register: (nome: string, email: string, senha: string, tipo: OrganizationType, nomeOrganizacao?: string) => Promise<void>;
  logout: () => void;
}