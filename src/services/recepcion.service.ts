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
  // Confirma el pago de una cuota PENDIENTE: crea el Pago y la pasa a ACTIVA.
  confirmPayment: async (cuotaId: number, payload: { metodoPagoId: number; monto: number }) => {
    const response = await api.post<ApiResponse>(`/quotas/${cuotaId}/confirm-payment`, payload);
    return response.data;
  },
  updateProfile: async (payload: UpdateProfilePayload) => {
    const response = await api.patch<ApiResponse<{ user: AuthUser }>>('/recepcion/me', payload);
    return response.data.data!.user;
  },
};
