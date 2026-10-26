import { api } from '@/services/api';
import type { ApiResponse } from '@/types';
import type { NotificationFilter, NotificationList } from '@/types/trainer';
import type {
  AttendanceRecord,
  CheckoutConfig,
  ClassDayList,
  ClientHome,
  ClientPlan,
  ClientProfileData,
  ClientRecipe,
  ClientRecipeDetail,
  ClientRoutine,
  MyClass,
  Paged,
  PaymentReceipt,
  PaymentRecord,
  RecipeFilters,
  PaymentVerification,
} from '@/types/client';

// Todas las rutas cuelgan de /api/cliente: el backend identifica al cliente por el token.
const unwrap = <T>(response: { data: ApiResponse<T> }) => response.data.data as T;

export const clientService = {
  getHome: async () => unwrap<ClientHome>(await api.get('/cliente/inicio')),

  listRoutines: async () => unwrap<ClientRoutine[]>(await api.get('/cliente/rutinas')),
  listRoutineHistory: async () => unwrap<ClientRoutine[]>(await api.get('/cliente/rutinas/historial')),

  listClasses: async (fecha?: string) => unwrap<ClassDayList>(await api.get('/cliente/clases', { params: fecha ? { fecha } : undefined })),
  listMyClasses: async () => unwrap<MyClass[]>(await api.get('/cliente/clases/mias')),
  enroll: async (id: number, fecha?: string) => unwrap<{ claseId: number }>(await api.post(`/cliente/clases/${id}/inscripcion`, { fecha })),
  cancelEnrollment: async (id: number) => unwrap<{ claseId: number }>(await api.delete(`/cliente/clases/${id}/inscripcion`)),

  listRecipeCategories: async () => unwrap<Array<{ id: number; nombre: string }>>(await api.get('/cliente/categorias-receta')),
  // Los filtros y el orden los resuelve el backend; solo se envían los que tienen valor.
  listRecipes: async (filters: RecipeFilters) =>
    unwrap<ClientRecipe[]>(
      await api.get('/cliente/recetas', {
        params: {
          categoria: filters.categoria,
          ...(filters.q.trim() ? { q: filters.q.trim() } : {}),
          ...(filters.caloriasMax !== '' ? { caloriasMax: filters.caloriasMax } : {}),
          ...(filters.proteinasMin !== '' ? { proteinasMin: filters.proteinasMin } : {}),
          ...(filters.orden !== 'recientes' ? { orden: filters.orden } : {}),
        },
      })
    ),
  getRecipe: async (id: number) => unwrap<ClientRecipeDetail>(await api.get(`/cliente/recetas/${id}`)),

  listPlans: async () => unwrap<ClientPlan[]>(await api.get('/cliente/planes')),
  // Solo se envía plan_id: el monto lo calcula el backend.
  createCheckout: async (planId: number) =>
    unwrap<{ cuotaId: number; preferenceId: string; initPoint: string; resumen: { plan: string; monto: number; vigencia: { desde: string; hasta: string }; expiraEn: string } }>(await api.post('/cliente/membresia/checkout', { plan_id: planId }, { timeout: 30000 })),
  getCheckoutConfig: async () => unwrap<CheckoutConfig>(await api.get('/cliente/membresia/pago/config')),
  verifyPayment: async (params: Record<string, string>) =>
    unwrap<PaymentVerification>(await api.get('/cliente/membresia/pago/verificar', { params, timeout: 30000 })),

  // Descarta una solicitud de pago que nunca se pagó (si Mercado Pago ya la aprobó, la activa).
  discardRequest: async (id: number) => unwrap<PaymentVerification & { estado: string }>(await api.delete(`/cliente/membresia/solicitudes/${id}`, { timeout: 30000 })),
  getProfile: async () => unwrap<ClientProfileData>(await api.get('/cliente/perfil')),
  changePassword: async (payload: { currentPassword: string; newPassword: string }) => {
    const response = await api.put<ApiResponse>('/cliente/perfil/password', payload);
    return response.data;
  },
  listPayments: async (page: number) => unwrap<Paged<PaymentRecord>>(await api.get('/cliente/pagos', { params: { page, limit: 10 } })),
  getReceiptData: async (paymentId: number) => unwrap<PaymentReceipt>(await api.get(`/cliente/pagos/${paymentId}/comprobante`, { params: { formato: 'json' } })),
  // Comprobante imprimible (HTML): se baja con el token (no hay URL pública) y se abre en otra pestaña.
  downloadReceipt: async (paymentId: number) => {
    const response = await api.get(`/cliente/pagos/${paymentId}/comprobante`, { responseType: 'blob' });
    return response.data as Blob;
  },
  listAttendances: async (page: number) => unwrap<Paged<AttendanceRecord>>(await api.get('/cliente/asistencias', { params: { page, limit: 10 } })),
  // Documento médico: se baja con el token (no hay URL pública).
  downloadMedicalClearance: async () => {
    const response = await api.get('/cliente/apto-fisico/archivo', { responseType: 'blob' });
    return response.data as Blob;
  },

  listNotifications: async (filtro: NotificationFilter) => unwrap<NotificationList>(await api.get('/cliente/notificaciones', { params: { filtro } })),
  markNotificationRead: async (id: number) => unwrap<{ id: number }>(await api.patch(`/cliente/notificaciones/${id}/leida`)),
  markAllNotificationsRead: async () => unwrap<{ actualizadas: number }>(await api.patch('/cliente/notificaciones/leidas')),
};
