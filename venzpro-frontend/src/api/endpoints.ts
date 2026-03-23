import api from './api';
import type {
  Organization, User, Company, Customer, Order, Product,
  Event, CatalogFile, OrderStatus, CustomerStatus, CreateOrderPayload,
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
  list:   ()                                => api.get<Company[]>('/companies').then(r => r.data),
  get:    (id: string)                      => api.get<Company>(`/companies/${id}`).then(r => r.data),
  create: (d: { nome: string })             => api.post<Company>('/companies', d).then(r => r.data),
  update: (id: string, d: { nome: string }) => api.put<Company>(`/companies/${id}`, d).then(r => r.data),
  remove: (id: string)                      => api.delete(`/companies/${id}`).then(r => r.data),
};

// ── Customers ─────────────────────────────────────────────────────────────────

export type CustomerPayload = Pick<Customer, 'nome'> &
    Partial<Pick<Customer, 'telefone' | 'email' | 'cidade' | 'cpfCnpj' | 'status'>>;

export interface CustomerStatusPayload {
  status: CustomerStatus;
  motivo?: string;
}

export interface CustomerOwnerPayload {
  ownerId: string | null;
}

export const customersApi = {
  list:         ()                               => api.get<Customer[]>('/customers').then(r => r.data),
  get:          (id: string)                     => api.get<Customer>(`/customers/${id}`).then(r => r.data),
  create:       (d: CustomerPayload)             => api.post<Customer>('/customers', d).then(r => r.data),
  update:       (id: string, d: CustomerPayload) => api.put<Customer>(`/customers/${id}`, d).then(r => r.data),
  updateStatus: (id: string, d: CustomerStatusPayload) =>
      api.patch<Customer>(`/customers/${id}/status`, d).then(r => r.data),
  updateOwner:  (id: string, d: CustomerOwnerPayload) =>
      api.patch<Customer>(`/customers/${id}/owner`, d).then(r => r.data),
  remove:       (id: string) => api.delete(`/customers/${id}`).then(r => r.data),
};

// ── Orders ────────────────────────────────────────────────────────────────────

export const ordersApi = {
  list:   (status?: OrderStatus) =>
      api.get<Order[]>('/orders', { params: status ? { status } : {} }).then(r => r.data),
  get:    (id: string) =>
      api.get<Order>(`/orders/${id}`).then(r => r.data),
  create: (d: CreateOrderPayload) =>
      api.post<Order>('/orders', d).then(r => r.data),
  update: (id: string, d: CreateOrderPayload) =>
      api.put<Order>(`/orders/${id}`, d).then(r => r.data),
  updateStatus: (id: string, status: OrderStatus, motivo?: string) =>
      api.patch<Order>(`/orders/${id}/status`, { status, motivo }).then(r => r.data),
  remove: (id: string) =>
      api.delete(`/orders/${id}`).then(r => r.data),
};

// ── Products ──────────────────────────────────────────────────────────────────

export interface ProductPayload {
  nome:        string;
  descricao?:  string;
  precoBase:   number;
  unidade:     string;
  companyId?:  string;
  codigoSku?:  string;
}

export interface PageResponse<T> {
  content:          T[];
  totalElements:    number;
  totalPages:       number;
  number:           number;
  size:             number;
}

export const productsApi = {
  // ── Listagem paginada ──────────────────────────────────────────────────────
  list: (page = 0, size = 20) =>
      api.get<PageResponse<Product>>('/products', {
        params: { page, size, sort: 'nome,asc' },
      }).then(r => r.data),

  // ── Busca full-text paginada ───────────────────────────────────────────────
  search: (termo: string, page = 0, size = 20) =>
      api.get<PageResponse<Product>>('/products/search', {
        params: { termo, page, size, sort: 'nome,asc' },
      }).then(r => r.data),

  // ── CRUD ──────────────────────────────────────────────────────────────────
  get:    (id: string) =>
      api.get<Product>(`/products/${id}`).then(r => r.data),

  create: (d: ProductPayload) =>
      api.post<Product>('/products', d).then(r => r.data),

  update: (id: string, d: ProductPayload) =>
      api.put<Product>(`/products/${id}`, d).then(r => r.data),

  patchPrice: (id: string, novoPreco: number) =>
      api.patch<Product>(`/products/${id}/price`, { novoPreco }).then(r => r.data),

  remove: (id: string) =>
      api.delete(`/products/${id}`).then(r => r.data),

  // ── Importação CSV ────────────────────────────────────────────────────────

  importCsv: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<string>('/products/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  // ── Exportação Excel ──────────────────────────────────────────────────────
  exportExcel: () =>
      api.get<Blob>('/products/export', { responseType: 'blob' }).then(r => r.data),
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
  list:   ()                            => api.get<Event[]>('/events').then(r => r.data),
  get:    (id: string)                  => api.get<Event>(`/events/${id}`).then(r => r.data),
  create: (d: EventPayload)             => api.post<Event>('/events', d).then(r => r.data),
  update: (id: string, d: EventPayload) => api.put<Event>(`/events/${id}`, d).then(r => r.data),
  remove: (id: string)                  => api.delete(`/events/${id}`).then(r => r.data),
};

// ── Files ─────────────────────────────────────────────────────────────────────

export interface FilePayload {
  companyId: string;
  nome:      string;
  url:       string;
  tipo:      CatalogFile['tipo'];
}

export const filesApi = {
  list:          ()                  => api.get<CatalogFile[]>('/files').then(r => r.data),
  listByCompany: (companyId: string) => api.get<CatalogFile[]>(`/files/company/${companyId}`).then(r => r.data),
  get:           (id: string)        => api.get<CatalogFile>(`/files/${id}`).then(r => r.data),
  create:        (d: FilePayload)    => api.post<CatalogFile>('/files', d).then(r => r.data),
  remove:        (id: string)        => api.delete(`/files/${id}`).then(r => r.data),
};

// ── Organizations ─────────────────────────────────────────────────────────────

export const organizationsApi = {
  get:    (id: string)                           => api.get<Organization>(`/organizations/${id}`).then(r => r.data),
  update: (id: string, d: Partial<Organization>) => api.put<Organization>(`/organizations/${id}`, d).then(r => r.data),
};