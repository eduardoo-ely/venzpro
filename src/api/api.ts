import axios from 'axios';
import type {
  Organization, User, Company, Customer, Order, Event, CatalogFile, OrderStatus
} from '@/types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  headers: { 'Content-Type': 'application/json' },
});

// Organizations
export const getOrganizations = () => api.get<Organization[]>('/organizations').then(r => r.data);
export const createOrganization = (data: Partial<Organization>) => api.post<Organization>('/organizations', data).then(r => r.data);
export const updateOrganization = (id: string, data: Partial<Organization>) => api.put<Organization>(`/organizations/${id}`, data).then(r => r.data);

// Users
export const getUsersByOrg = (orgId: string) => api.get<User[]>(`/users/organization/${orgId}`).then(r => r.data);
export const createUser = (data: Partial<User>) => api.post<User>('/users', data).then(r => r.data);
export const updateUser = (id: string, data: Partial<User>) => api.put<User>(`/users/${id}`, data).then(r => r.data);
export const deleteUser = (id: string) => api.delete(`/users/${id}`).then(r => r.data);

// Companies
export const getCompaniesByOrg = (orgId: string) => api.get<Company[]>(`/companies/organization/${orgId}`).then(r => r.data);
export const createCompany = (data: Partial<Company>) => api.post<Company>('/companies', data).then(r => r.data);
export const updateCompany = (id: string, data: Partial<Company>) => api.put<Company>(`/companies/${id}`, data).then(r => r.data);
export const deleteCompany = (id: string) => api.delete(`/companies/${id}`).then(r => r.data);

// Customers
export const getCustomersByOrg = (orgId: string) => api.get<Customer[]>(`/customers/organization/${orgId}`).then(r => r.data);
export const createCustomer = (data: Partial<Customer>) => api.post<Customer>('/customers', data).then(r => r.data);
export const updateCustomer = (id: string, data: Partial<Customer>) => api.put<Customer>(`/customers/${id}`, data).then(r => r.data);
export const deleteCustomer = (id: string) => api.delete(`/customers/${id}`).then(r => r.data);

// Orders
export const getOrdersByOrg = (orgId: string, status?: OrderStatus) => {
  const params = status ? { status } : {};
  return api.get<Order[]>(`/orders/organization/${orgId}`, { params }).then(r => r.data);
};
export const createOrder = (data: Partial<Order>) => api.post<Order>('/orders', data).then(r => r.data);
export const updateOrder = (id: string, data: Partial<Order>) => api.put<Order>(`/orders/${id}`, data).then(r => r.data);
export const patchOrderStatus = (id: string, status: OrderStatus) => api.patch<Order>(`/orders/${id}/status`, null, { params: { status } }).then(r => r.data);
export const deleteOrder = (id: string) => api.delete(`/orders/${id}`).then(r => r.data);

// Events
export const getEventsByOrg = (orgId: string) => api.get<Event[]>(`/events/organization/${orgId}`).then(r => r.data);
export const createEvent = (data: Partial<Event>) => api.post<Event>('/events', data).then(r => r.data);
export const updateEvent = (id: string, data: Partial<Event>) => api.put<Event>(`/events/${id}`, data).then(r => r.data);
export const deleteEvent = (id: string) => api.delete(`/events/${id}`).then(r => r.data);

// Files
export const getFilesByOrg = (orgId: string) => api.get<CatalogFile[]>(`/files/organization/${orgId}`).then(r => r.data);
export const getFilesByCompany = (companyId: string) => api.get<CatalogFile[]>(`/files/company/${companyId}`).then(r => r.data);
export const createFile = (data: Partial<CatalogFile>) => api.post<CatalogFile>('/files', data).then(r => r.data);
export const deleteFile = (id: string) => api.delete(`/files/${id}`).then(r => r.data);

export default api;
