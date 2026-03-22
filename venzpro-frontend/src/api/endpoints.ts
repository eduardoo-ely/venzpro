/**
 * Funções de chamada à API.
 * Sem mocks, sem fallbacks — chamam o backend diretamente.
 * Os hooks em src/hooks/ consomem estas funções via TanStack Query.
 */
import api from './api';
import type {
  Organization, User, Company, Customer, Order, Product,
  Event, CatalogFile, OrderStatus, CreateOrderPayload,
} from '@/types';

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginPayload    { email: string; senha: string }
export interface RegisterPayload {
  nome: string; email: string; senha: string;
  nomeOrganizacao: string; tipoOrganizacao: 'REPRESENTANTE' | 'EMPRESA';
}
export interface AuthResponse {
  token: string;
  user: { id: string; nome: string; email: string; role: string };
  organization: { id: string; nome: string; tipo: string };
}

export const authApi = {
  login:    (d: LoginPayload)    => api.post<AuthResponse>('/auth/login', d).then(r => r.data),
  register: (d: RegisterPayload) => api.post<AuthResponse>('/auth/register', d).then(r => r.data),
};

// ── Users ─────────────────────────────────────────────────────────────────────

export const usersApi = {
  list:       ()                           => api.get<User[]>('/users').then(r => r.data),
  get:        (id: string)                 => api.get<User>(`/users/${id}`).then(r => r.data),
  updateRole: (id: string, role: string)   => api.patch<User>(`/users/${id}/role`, { role }).then(r => r.data),
  remove:     (id: string)                 => api.delete(`/users/${id}`).then(r => r.data),
};

// ── Companies ─────────────────────────────────────────────────────────────────

export const companiesApi = {
  list:   ()                           => api.get<Company[]>('/companies').then(r => r.data),
  get:    (id: string)                 => api.get<Company>(`/companies/${id}`).then(r => r.data),
  create: (d: { nome: string })        => api.post<Company>('/companies', d).then(r => r.data),
  update: (id: string, d: { nome: string }) => api.put<Company>(`/companies/${id}`, d).then(r => r.data),
  remove: (id: string)                 => api.delete(`/companies/${id}`).then(r => r.data),
};

// ── Customers ─────────────────────────────────────────────────────────────────

export type CustomerPayload = Pick<Customer, 'nome'> & Partial<Pick<Customer, 'telefone' | 'email' | 'cidade' | 'cpfCnpj'>>;

export const customersApi = {
  list:   ()                               => api.get<Customer[]>('/customers').then(r => r.data),
  get:    (id: string)                     => api.get<Customer>(`/customers/${id}`).then(r => r.data),
  create: (d: CustomerPayload)             => api.post<Customer>('/customers', d).then(r => r.data),
  update: (id: string, d: CustomerPayload) => api.put<Customer>(`/customers/${id}`, d).then(r => r.data),
  remove: (id: string)                     => api.delete(`/customers/${id}`).then(r => r.data),
};

// ── Orders ────────────────────────────────────────────────────────────────────

export const ordersApi = {
  list:         (status?: OrderStatus)                 => api.get<Order[]>('/orders', { params: status ? { status } : {} }).then(r => r.data),
  get:          (id: string)                           => api.get<Order>(`/orders/${id}`).then(r => r.data),
  create:       (d: CreateOrderPayload)                => api.post<Order>('/orders', d).then(r => r.data),
  update:       (id: string, d: CreateOrderPayload)    => api.put<Order>(`/orders/${id}`, d).then(r => r.data),
  updateStatus: (id: string, status: OrderStatus)      => api.patch<Order>(`/orders/${id}/status`, {}, { params: { status } }).then(r => r.data),
  remove:       (id: string)                           => api.delete(`/orders/${id}`).then(r => r.data),
};

export const productsApi = {
  list: () => api.get<{ content: Product[] }>('/products', { params: { page: 0, size: 1000, sort: 'nome,asc' } }).then(r => r.data.content),
  get:  (id: string) => api.get<Product>(`/products/${id}`).then(r => r.data),
};

// ── Events ────────────────────────────────────────────────────────────────────

export interface EventPayload {
  titulo:         string;
  tipo:           Event['tipo'];
  status:         Event['status'];
  dataInicio:     string;
  dataFim?:       string;
  customerId?:    string;
  companyId?:     string;
  descricao?:     string;
  participantes?: string[];
}

export const eventsApi = {
  list:   ()                               => api.get<Event[]>('/events').then(r => r.data),
  get:    (id: string)                     => api.get<Event>(`/events/${id}`).then(r => r.data),
  create: (d: EventPayload)                => api.post<Event>('/events', d).then(r => r.data),
  update: (id: string, d: EventPayload)    => api.put<Event>(`/events/${id}`, d).then(r => r.data),
  remove: (id: string)                     => api.delete(`/events/${id}`).then(r => r.data),
};

// ── Files ─────────────────────────────────────────────────────────────────────

export interface FilePayload {
  companyId: string;
  nome:      string;
  url:       string;
  tipo:      CatalogFile['tipo'];
}

export const filesApi = {
  list:          ()                       => api.get<CatalogFile[]>('/files').then(r => r.data),
  listByCompany: (companyId: string)      => api.get<CatalogFile[]>(`/files/company/${companyId}`).then(r => r.data),
  get:           (id: string)             => api.get<CatalogFile>(`/files/${id}`).then(r => r.data),
  create:        (d: FilePayload)         => api.post<CatalogFile>('/files', d).then(r => r.data),
  remove:        (id: string)             => api.delete(`/files/${id}`).then(r => r.data),
};

// ── Organizations ─────────────────────────────────────────────────────────────

export const organizationsApi = {
  get:    (id: string)                              => api.get<Organization>(`/organizations/${id}`).then(r => r.data),
  update: (id: string, d: Partial<Organization>)    => api.put<Organization>(`/organizations/${id}`, d).then(r => r.data),
};
