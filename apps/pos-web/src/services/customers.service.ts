/**
 * CoffeeOS POS Web - Customers Service
 * Servicio para gestión de clientes y CRM
 *
 * El backend (apps/api/src/modules/crm) habla snake_case en el wire
 * (ver mapToInterface en customers.service.ts del API). Este servicio
 * traduce wire (snake_case) ↔ tipo de UI `Customer` (camelCase).
 */

import { api } from '@/lib/api';
import { Customer, CustomerStatus } from '@/types';

/** Shape real que devuelve el backend para un customer. */
export interface CustomerWire {
  id: string;
  organization_id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  preferred_language?: string | null;
  notes?: string | null;
  consent_marketing: boolean;
  consent_whatsapp: boolean;
  consent_email: boolean;
  consent_sms: boolean;
  consent_date?: string | null;
  consent_ip_address?: string | null;
  favorite_drink?: string | null;
  dietary_restrictions?: string | null;
  allergies?: string | null;
  status: CustomerStatus;
  blocked_reason?: string | null;
  loyalty_points: number;
  total_visits: number;
  total_spent: number;
  last_visit_date?: string | null;
  rfm_segment?: string | null;
  recency_score?: number | null;
  frequency_score?: number | null;
  monetary_score?: number | null;
  created_at: string;
  updated_at: string;
}

function fromWire(w: CustomerWire): Customer {
  return {
    id: w.id,
    organization_id: w.organization_id,
    firstName: w.first_name ?? undefined,
    lastName: w.last_name ?? undefined,
    email: w.email ?? undefined,
    phone: w.phone ?? undefined,
    dateOfBirth: w.date_of_birth ?? undefined,
    gender: w.gender ?? undefined,
    preferredLanguage: w.preferred_language ?? undefined,
    notes: w.notes ?? undefined,
    consentMarketing: w.consent_marketing,
    consentWhatsapp: w.consent_whatsapp,
    consentEmail: w.consent_email,
    consentSms: w.consent_sms,
    consentDate: w.consent_date ?? undefined,
    favoriteDrink: w.favorite_drink ?? undefined,
    dietaryRestrictions: w.dietary_restrictions ?? undefined,
    allergies: w.allergies ?? undefined,
    status: w.status,
    blockedReason: w.blocked_reason ?? undefined,
    loyaltyPoints: w.loyalty_points,
    totalVisits: w.total_visits,
    totalSpent: w.total_spent,
    lastVisitDate: w.last_visit_date ?? undefined,
    rfmSegment: w.rfm_segment ?? undefined,
    recencyScore: w.recency_score ?? undefined,
    frequencyScore: w.frequency_score ?? undefined,
    monetaryScore: w.monetary_score ?? undefined,
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  };
}

/** Devuelve undefined para strings vacíos (los DTOs rechazan '' en email/fechas). */
function emptyToUndefined(value?: string | null): string | undefined {
  if (value === undefined || value === null) return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/**
 * Mapea el Customer camelCase de la UI al payload snake_case que esperan
 * CreateCustomerDto / UpdateCustomerDto. El ValidationPipe global usa
 * forbidNonWhitelisted, así que SOLO se incluyen campos del DTO.
 */
function toWritePayload(
  data: Partial<Customer>,
  options: { includeConsentDefaults: boolean },
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (data.firstName !== undefined) payload.first_name = data.firstName;
  if (data.lastName !== undefined) payload.last_name = data.lastName;
  if (data.email !== undefined) payload.email = emptyToUndefined(data.email);
  if (data.phone !== undefined) payload.phone = emptyToUndefined(data.phone);
  if (data.dateOfBirth !== undefined)
    payload.date_of_birth = emptyToUndefined(data.dateOfBirth);
  if (data.gender !== undefined) payload.gender = emptyToUndefined(data.gender);
  if (data.preferredLanguage !== undefined)
    payload.preferred_language = data.preferredLanguage;
  if (data.notes !== undefined) payload.notes = data.notes;
  if (data.favoriteDrink !== undefined)
    payload.favorite_drink = data.favoriteDrink;
  if (data.dietaryRestrictions !== undefined)
    payload.dietary_restrictions = data.dietaryRestrictions;
  if (data.allergies !== undefined) payload.allergies = data.allergies;

  // LFPDPPP: CreateCustomerDto exige los 4 booleanos siempre.
  if (options.includeConsentDefaults) {
    payload.consent_marketing = data.consentMarketing ?? false;
    payload.consent_whatsapp = data.consentWhatsapp ?? false;
    payload.consent_email = data.consentEmail ?? false;
    payload.consent_sms = data.consentSms ?? false;
  } else {
    if (data.consentMarketing !== undefined)
      payload.consent_marketing = data.consentMarketing;
    if (data.consentWhatsapp !== undefined)
      payload.consent_whatsapp = data.consentWhatsapp;
    if (data.consentEmail !== undefined)
      payload.consent_email = data.consentEmail;
    if (data.consentSms !== undefined) payload.consent_sms = data.consentSms;
    if (data.status !== undefined) payload.status = data.status;
    if (data.blockedReason !== undefined)
      payload.blocked_reason = data.blockedReason;
  }

  return payload;
}

class CustomersService {
  private readonly baseUrl = '/crm/customers';

  // ============================================================================
  // CUSTOMERS CRUD
  // ============================================================================

  /**
   * GET /crm/customers devuelve un array plano (sin paginación).
   * El backend solo soporta los filtros de QueryCustomersDto: search,
   * segment_id, status, birthday_month. `rfm_segment` se mapea a `segment_id`;
   * `loyalty_tier` NO existe en backend (filtrar client-side si se necesita).
   */
  async getCustomers(
    _organizationId: string,
    filters?: {
      search?: string;
      rfm_segment?: string;
      status?: string;
    },
  ): Promise<Customer[]> {
    const params = new URLSearchParams();

    // organization_id sale del JWT en el backend; no es necesario enviarlo.
    if (filters?.search) params.append('search', filters.search);
    if (filters?.rfm_segment) params.append('segment_id', filters.rfm_segment);
    if (filters?.status) params.append('status', filters.status);

    const query = params.toString();
    const wire = await api.get<CustomerWire[]>(
      query ? `${this.baseUrl}?${query}` : this.baseUrl,
    );
    return Array.isArray(wire) ? wire.map(fromWire) : [];
  }

  async getCustomerById(id: string): Promise<Customer> {
    const wire = await api.get<CustomerWire>(`${this.baseUrl}/${id}`);
    return fromWire(wire);
  }

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    const wire = await api.post<CustomerWire>(
      this.baseUrl,
      toWritePayload(data, { includeConsentDefaults: true }),
    );
    return fromWire(wire);
  }

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    // El backend expone @Patch(':id'), no PUT.
    const wire = await api.patch<CustomerWire>(
      `${this.baseUrl}/${id}`,
      toWritePayload(data, { includeConsentDefaults: false }),
    );
    return fromWire(wire);
  }

  async deleteCustomer(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  // ============================================================================
  // SEARCH (GET /crm/customers/search — busca por nombre/teléfono/email)
  // ============================================================================

  async searchCustomers(
    _organizationId: string,
    query: string,
  ): Promise<Customer[]> {
    const wire = await api.get<CustomerWire[]>(
      `${this.baseUrl}/search?q=${encodeURIComponent(query)}`,
    );
    return Array.isArray(wire) ? wire.map(fromWire) : [];
  }

  // ============================================================================
  // ENDPOINTS NO IMPLEMENTADOS EN BACKEND
  // Estos métodos apuntaban a rutas que no existen (404 garantizado).
  // Se dejan como throw explícito para que el fallo sea visible.
  // ============================================================================

  // TODO: implementar cuando el backend exponga GET /crm/customers/phone/:phone
  async getCustomerByPhone(
    _phone: string,
    _organizationId: string,
  ): Promise<Customer> {
    throw new Error(
      'No implementado en backend: GET /crm/customers/phone/:phone',
    );
  }

  // TODO: implementar cuando el backend exponga GET /crm/customers/email/:email
  async getCustomerByEmail(
    _email: string,
    _organizationId: string,
  ): Promise<Customer> {
    throw new Error(
      'No implementado en backend: GET /crm/customers/email/:email',
    );
  }

  // TODO: implementar cuando el backend exponga GET /crm/customers/:id/loyalty
  async getLoyaltyPoints(
    _customerId: string,
  ): Promise<{ points: number; tier: string }> {
    throw new Error(
      'No implementado en backend: GET /crm/customers/:id/loyalty',
    );
  }

  // TODO: implementar cuando el backend exponga POST /crm/customers/:id/loyalty/add
  async addLoyaltyPoints(
    _customerId: string,
    _points: number,
    _reason?: string,
  ): Promise<Customer> {
    throw new Error(
      'No implementado en backend: POST /crm/customers/:id/loyalty/add',
    );
  }

  // TODO: implementar cuando el backend exponga POST /crm/customers/:id/loyalty/redeem
  async redeemLoyaltyPoints(
    _customerId: string,
    _points: number,
    _reason?: string,
  ): Promise<Customer> {
    throw new Error(
      'No implementado en backend: POST /crm/customers/:id/loyalty/redeem',
    );
  }

  // TODO: implementar cuando el backend exponga GET /crm/customers/:id/loyalty/history
  async getLoyaltyHistory(_customerId: string): Promise<
    Array<{
      id: string;
      type: 'EARN' | 'REDEEM';
      points: number;
      reason: string;
      created_at: Date;
    }>
  > {
    throw new Error(
      'No implementado en backend: GET /crm/customers/:id/loyalty/history',
    );
  }

  // TODO: implementar cuando el backend exponga GET /crm/customers/:id/stats
  // (hoy solo existe GET /crm/customers/stats a nivel organización)
  async getCustomerStats(_customerId: string): Promise<{
    total_orders: number;
    total_spent: number;
    average_order: number;
    last_visit: Date;
    favorite_products: Array<{ product_name: string; times_ordered: number }>;
    rfm_score: { recency: number; frequency: number; monetary: number };
  }> {
    throw new Error('No implementado en backend: GET /crm/customers/:id/stats');
  }
}

export const customersService = new CustomersService();
export default CustomersService;
