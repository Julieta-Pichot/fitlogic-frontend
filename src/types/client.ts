export interface StreakDay {
  diaSemana: number;
  fecha: string;
  asistio: boolean;
  esHoy: boolean;
  futuro: boolean;
}

export interface Streak {
  dias: StreakDay[];
  diasAsistidos: number;
  // null = el cliente todavía no tiene objetivo definido
  objetivoDias: number | null;
}

export interface PlanInfo {
  id: number;
  nombre: string;
  precio: number;
  duracionDias: number;
}

export interface Membership {
  estado: 'ACTIVA' | 'VENCIDA' | 'SIN_MEMBRESIA';
  cuota: { id: number; plan: PlanInfo; fechaInicio: string; fechaVencimiento: string; diasRestantes: number; progreso: number } | null;
  solicitudPendiente: boolean;
  // Solicitudes de pago sin pago: se pueden verificar o descartar.
  solicitudesPendientes: Array<{ id: number; plan: string }>;
}

export interface ClientRoutineExercise {
  id: number;
  orden: number;
  nombre: string;
  grupoMuscular: string | null;
  series: number | null;
  repeticiones: number | null;
  descansoSegundos: number | null;
  observaciones: string | null;
  videoUrl: string | null;
}

export interface ClientRoutine {
  id: number;
  nombre: string;
  descripcion: string | null;
  objetivo: string | null;
  nivelDificultad: string | null;
  frecuenciaSemanal: number | null;
  duracionEstimada: number | null;
  activa: boolean;
  fechaAsignacion: string;
  profesor: string;
  diasSemana: number[];
  cantidadEjercicios: number;
  ejercicios: ClientRoutineExercise[];
}

export interface MyClass {
  id: number;
  nombre: string;
  profesor: string;
  sala: string | null;
  recurrente: boolean;
  dias: number[];
  fecha: string | null;
  horaInicio: string;
  horaFin: string;
  proximaOcurrencia: string | null;
  minutosRestantes: number | null;
  finalizada: boolean;
  puedeDarseDeBaja: boolean;
}

export interface ClientHome {
  cliente: { estado: string };
  racha: Streak;
  membresia: Membership;
  rutinasHoy: ClientRoutine[];
  proximaClase: MyClass | null;
}

export interface WeekDay {
  fecha: string;
  diaSemana: number;
  esHoy: boolean;
}

export interface ClassListItem {
  id: number;
  nombre: string;
  profesor: string;
  sala: string | null;
  recurrente: boolean;
  inicio: string;
  horaInicio: string;
  horaFin: string;
  cupoMaximo: number;
  inscriptos: number;
  estado: 'DISPONIBLE' | 'COMPLETA' | 'INSCRIPTO' | 'YA_COMENZO';
  puedeInscribirse: boolean;
  puedeDarseDeBaja: boolean;
}

export interface ClassDayList {
  hoy: string;
  dias: WeekDay[];
  fecha: string;
  clases: ClassListItem[];
}

// Valores nutricionales POR PORCIÓN. null = "No informado" (nunca se muestra como 0).
export interface Nutrition {
  calorias: number | null;
  proteinasG: number | null;
  carbohidratosG: number | null;
  grasasG: number | null;
  porciones: number | null;
  otroDatoNutricional: string | null;
}

export interface MacroDistribution {
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  kcalCalculadas: number;
}

export interface ClientRecipe extends Nutrition {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoria: { id: number; nombre: string };
  tiempoPreparacion: number | null;
  foto: string | null;
  profesor: string;
}

export type RecipeOrder = 'recientes' | 'nombre' | 'calorias_asc' | 'proteinas_desc';

export interface RecipeFilters {
  categoria: string;
  q: string;
  caloriasMax: string;
  proteinasMin: string;
  orden: RecipeOrder;
}

export interface ClientRecipeDetail extends ClientRecipe {
  distribucionMacros: MacroDistribution | null;
  ingredientes: Array<{ id: number; nombre: string; cantidad: string | null; unidad: string | null }>;
  pasos: Array<{ numeroPaso: number; descripcion: string }>;
}

export interface ClientPlan {
  id: number;
  nombre: string;
  duracionDias: number;
  precio: number;
  promocion: { id: number; nombre: string; descuento: number } | null;
  precioFinal: number;
  // Resumen de compra calculado por el backend: la membresía arranca el día del pago.
  vigencia: { desde: string; hasta: string };
}

export interface MedicalClearance {
  estado: 'SIN_CARGAR' | 'VIGENTE' | 'POR_VENCER' | 'VENCIDO';
  fechaCarga: string | null;
  fechaVencimiento: string | null;
  diasRestantes: number | null;
  tieneArchivo: boolean;
}

export interface ClientProfileData {
  usuario: { nombre: string; apellido: string; email: string; telefono: string | null };
  cliente: { estado: string; objetivoEntrenamiento: string | null; objetivoDiasRacha: number | null; fechaAlta: string };
  membresia: Membership;
  aptoFisico: MedicalClearance;
}

export interface PaymentRecord {
  id: number;
  fechaPago: string;
  plan: string;
  monto: number;
  metodo: string;
  medioPago: string | null;
  ultimosDigitos: string | null;
  referencia: string | null;
  periodo: { desde: string; hasta: string };
}

export interface AttendanceRecord {
  id: number;
  fechaHora: string;
}

export interface Paged<T> {
  items: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface PaymentReceipt {
  pagoId: number;
  gimnasio: string;
  numeroOperacion: string;
  fechaPago: string;
  cliente: string;
  plan: string;
  vigencia: { desde: string; hasta: string };
  monto: number;
  metodo: string;
  metodoLabel: string;
  medioPago: string | null;
  ultimosDigitos: string | null;
}

export interface PaymentVerification {
  estado: 'APROBADO' | 'PENDIENTE' | 'RECHAZADO' | 'REVERTIDO' | 'SIN_PAGO';
  mensaje?: string;
  solicitudesRevisadas?: number;
  mpStatusDetail?: string | null;
  comprobante?: PaymentReceipt;
  yaProcesado?: boolean;
  // Solo en SIN_PAGO: si el servidor tiene URLs https públicas para el retorno automático y el webhook.
  retornoAutomatico?: boolean;
  webhookActivo?: boolean;
}

export interface CheckoutConfig {
  retornoAutomatico: boolean;
  webhookActivo: boolean;
}
