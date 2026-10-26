import { api } from '@/services/api';
import type { ApiResponse } from '@/types';

// Todo cuelga de /api/admin/ingresos (solo rol ADMIN). Los límites de día y mes los calcula el backend en hora de Buenos Aires.
const unwrap = <T>(response: { data: ApiResponse<T> }) => response.data.data as T;

export interface RangeParams {
  desde?: string;
  hasta?: string;
}

export interface PeriodTotals {
  cantidad: number;
  bruto: number;
  comisiones: number;
  neto: number;
  ticketPromedio: number;
}

export interface IncomeSummary {
  zonaHoraria: string;
  hoy: PeriodTotals & { desde: string; hasta: string };
  mes: PeriodTotals & { desde: string; hasta: string };
  mesAnterior: PeriodTotals & { desde: string; hasta: string };
  rango: PeriodTotals & { desde: string; hasta: string };
}

export interface BreakdownRow extends PeriodTotals {
  clave: string | number;
  nombre: string;
  porcentaje: number;
}

export interface IncomeBreakdown {
  rango: { desde: string; hasta: string };
  total: PeriodTotals;
  porMetodo: BreakdownRow[];
  porPlan: BreakdownRow[];
}

export interface ChartPoint {
  clave: string;
  etiqueta: string;
  bruto: number;
  neto: number;
  cantidad: number;
}

export interface IncomeChart {
  rango: { desde: string; hasta: string };
  agrupacion: 'dia' | 'mes';
  puntos: ChartPoint[];
}

export type PaymentSort = 'fecha' | 'cliente' | 'plan' | 'metodo' | 'bruto' | 'comision' | 'neto';

export interface PaymentFilters extends RangeParams {
  metodo?: string;
  planId?: string;
  q?: string;
  orden?: PaymentSort;
  dir?: 'asc' | 'desc';
}

export interface IncomePayment {
  id: number;
  fechaPago: string;
  fechaLocal: string;
  cliente: { id: number; nombre: string; email: string };
  plan: string;
  metodo: string;
  medioPago: string | null;
  ultimosDigitos: string | null;
  bruto: number;
  comision: number;
  neto: number;
  sinDatosDeNeto: boolean;
  referenciaExterna: string | null;
  estadoCuota: string;
  cuotaId: number;
  vigencia: { desde: string; hasta: string };
  fechaAcreditacion: string | null;
}

export interface IncomePaymentDetail extends IncomePayment {
  eventosMp: Array<{ id: number; estado: string; detalleEstado: string | null; origen: string; procesado: boolean; fechaRecepcion: string }>;
}

export interface PagedPayments {
  items: IncomePayment[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface PendingPayment {
  cuotaId: number;
  cliente: { id: number; nombre: string; email: string };
  plan: string;
  estadoCuota: string;
  estadoMp: string | null;
  detalleEstado: string | null;
  mensajeMp: string;
  mpPaymentId: string | null;
  monto: number | null;
  ultimoEvento: string | null;
  preferenciaVigente: boolean;
  antiguedadHoras: number;
  clasificacion: 'SIN_INTENTO' | 'PENDIENTE' | 'RECHAZADO';
}

export interface VerifyResult {
  estado: 'APROBADO' | 'PENDIENTE' | 'RECHAZADO' | 'REVERTIDO' | 'SIN_PAGO';
  mensaje?: string;
  yaProcesado?: boolean;
}

export interface Reconciliation {
  rango: { desde: string; hasta: string };
  soloLectura: boolean;
  truncado: boolean;
  resumen: { pagosAprobadosEnMp: number; pagosAjenosIgnorados: number; pagosLocalesMercadoPago: number; conDiferencias: number };
  enMpSinRegistro: Array<{ mpPaymentId: string; cuotaId: number | null; monto: number; fechaAprobacion: string | null }>;
  localSinPagoEnMp: Array<{ pagoId: number; referenciaExterna: string | null; monto: number; cliente: string; fechaPago: string; estadoEnMp: string }>;
  montosDistintos: Array<{ mpPaymentId: string; pagoId: number; brutoMp: number; brutoLocal: number; netoMp: number | null; netoLocal: number | null }>;
}

const clean = <T extends object>(params: T) => Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== '' && value !== null));

export const ingresosService = {
  getSummary: async (params: RangeParams) => unwrap<IncomeSummary>(await api.get('/admin/ingresos/resumen', { params: clean(params) })),
  getBreakdown: async (params: RangeParams) => unwrap<IncomeBreakdown>(await api.get('/admin/ingresos/desglose', { params: clean(params) })),
  getChart: async (params: RangeParams & { agrupar?: 'auto' | 'dia' | 'mes' }) => unwrap<IncomeChart>(await api.get('/admin/ingresos/grafico', { params: clean(params) })),
  listPayments: async (params: PaymentFilters & { page: number; limit: number }) =>
    unwrap<PagedPayments>(await api.get('/admin/ingresos/pagos', { params: clean(params) })),
  getPayment: async (id: number) => unwrap<IncomePaymentDetail>(await api.get(`/admin/ingresos/pagos/${id}`)),
  // CSV con los filtros activos: se baja con el token (no hay URL pública).
  exportCsv: async (params: PaymentFilters) => {
    const response = await api.get('/admin/ingresos/pagos/exportar.csv', { params: clean(params), responseType: 'blob', timeout: 60000 });
    return response.data as Blob;
  },
  listPending: async () => unwrap<{ items: PendingPayment[]; total: number }>(await api.get('/admin/ingresos/pendientes')),
  verifyPending: async (cuotaId: number) => unwrap<VerifyResult>(await api.post(`/admin/ingresos/pendientes/${cuotaId}/verificar`, undefined, { timeout: 30000 })),
  reconcile: async (params: RangeParams) => unwrap<Reconciliation>(await api.get('/admin/ingresos/conciliacion', { params: clean(params), timeout: 90000 })),
};
