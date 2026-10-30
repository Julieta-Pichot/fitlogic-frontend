import { api } from '@/services/api';
import type { ApiResponse, AuthUser } from '@/types';
import type { MembershipStatus } from '@/types/client';

export type ReceptionStats = {
  clientesActivos: number;
  clientesInactivos: number;
  pagosPendientes: number;
  asistenciasHoy: number;
  ingresosDelDia: number;
  ingresosDelMes: number;
};

export type ReceptionPayment = {
  id: number;
  monto: number;
  fechaPago: string;
  metodoPago: string;
  plan: string;
  cliente: { id: number; nombre: string };
};

export type ReceptionPlan = {
  id: number;
  nombre: string;
  duracionDias: number;
  precio: number;
  // Precio final calculado por el backend (promoción vigente incluida): es lo que se cobra.
  precioFinal: number;
  promocion: { id: number; nombre: string; descuento: number } | null;
};

// Cliente con un plan elegido sin pago confirmado. La tarjeta "Pagos Pendientes" y esta lista salen de la MISMA consulta del backend.
export type PendingPayment = {
  clienteId: number;
  cuotaId: number;
  nombre: string;
  email: string;
  telefono: string | null;
  estadoCliente: string;
  plan: string;
  monto: number;
  // 'YYYY-MM-DD': día desde el que está pendiente.
  pendienteDesde: string;
  diasEspera: number;
  estadoMembresia: MembershipStatus;
  diasRestantes: number | null;
  puedeRegistrarPago: boolean;
  motivoBloqueo: string | null;
};

export type UpdateProfilePayload = Partial<{
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
}>;

export const recepcionService = {
  getStats: async () => {
    const response = await api.get<ApiResponse<ReceptionStats>>('/recepcion/dashboard/stats');
    return response.data.data!;
  },
  listPayments: async (limit = 10) => {
    const response = await api.get<ApiResponse<ReceptionPayment[]>>('/recepcion/pagos', { params: { limit } });
    return response.data.data ?? [];
  },
  listPendingPayments: async () => {
    const response = await api.get<ApiResponse<{ total: number; items: PendingPayment[] }>>('/recepcion/pagos-pendientes');
    return response.data.data ?? { total: 0, items: [] };
  },
  listPlans: async () => {
    const response = await api.get<ApiResponse<ReceptionPlan[]>>('/recepcion/planes');
    return response.data.data ?? [];
  },
  // Cobro en caja: cuota pendiente O plan (renovación sin solicitud previa). El monto lo calcula el backend.
  registerPayment: async (payload: { clienteId: number; cuotaId?: number; planId?: number; metodoPagoId: number }) => {
    const response = await api.post<ApiResponse>('/recepcion/pagos', payload);
    return response.data;
  },
  updateProfile: async (payload: UpdateProfilePayload) => {
    const response = await api.patch<ApiResponse<{ user: AuthUser }>>('/recepcion/me', payload);
    return response.data.data!.user;
  },
};
