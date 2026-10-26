import { api } from '@/services/api';
import type { ApiResponse, AuthUser } from '@/types';

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
