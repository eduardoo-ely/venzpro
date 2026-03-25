export type OrganizationType = 'REPRESENTANTE' | 'EMPRESA';
export type UserRole = 'ADMIN' | 'GERENTE' | 'VENDEDOR' | 'SUPORTE';
export type OrderStatus = 'ORCAMENTO' | 'ENVIADO' | 'APROVADO' | 'REJEITADO' | 'CONCLUIDO' | 'CANCELADO';
export type CustomerStatus = 'PENDENTE' | 'APROVADO' | 'REJEITADO';
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
  role: string;
  podeAprovar: boolean;
  podeExportar: boolean;
  podeVerDashboard: boolean;
}

export interface Company {
  id:           string;
  nome:         string;
  cnpj?:        string;
  razaoSocial?: string;
  cep?:         string;
  logradouro?:  string;
  numero?:      string;
  complemento?: string;
  bairro?:      string;
  cidade?:      string;
  uf?:          string;
  organizationId: string;
  createdAt?:   string;
}
export interface Product {
  id: string;
  organizationId: string;
  companyId?: string;
  empresaNome?: string;
  nome: string;
  descricao?: string;
  precoBase: number;
  unidade?: string;
  ativo?: boolean;
  codigoSku?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  cidade?: string;
  status: CustomerStatus;
  cpfCnpj?: string;
  ownerId?: string;
  ownerNome?: string;
  createdBy?: string;
  organizationId: string;
  createdAt?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  nomeProduto?: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface CreateOrderPayload {
  customerId: string;
  companyId: string;
  descricao?: string;
  items: Array<{
    productId: string;
    quantidade: number;
  }>;
}

export interface Order {
  id: string;
  customerId: string;
  clienteNome: string;
  companyId: string;
  empresaNome: string;
  userId: string;
  vendedorNome: string;
  organizationId: string;
  valorTotal: number;
  status: OrderStatus;
  descricao?: string;
  items: OrderItem[];
  canceladoPor?: string;
  canceladoEm?: string;
  motivoCancelamento?: string;
  createdAt?: string;
}

export interface Event {
  id: string;
  titulo: string;
  tipo: EventType;
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
  register: (
    nome: string,
    email: string,
    senha: string,
    tipo: OrganizationType,
    nomeOrganizacao?: string
  ) => Promise<void>;
  logout: () => void;
}
