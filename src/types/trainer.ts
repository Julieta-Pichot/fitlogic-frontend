export interface TrainerClient {
  id: number;
  nombre: string;
  apellido: string;
  estado: string;
}

export interface CatalogExercise {
  id: number;
  nombre: string;
  grupoMuscular: string | null;
  tipo: string | null;
}

export interface CreatedExercise extends CatalogExercise {
  existente: boolean;
}

export interface RoutineSummary {
  id: number;
  nombre: string;
  objetivo: string | null;
  nivelDificultad: string | null;
  frecuenciaSemanal: number | null;
  duracionEstimada: number | null;
  activa: boolean;
  fechaAsignacion: string;
  diasSemana: number[];
  cantidadEjercicios: number;
}

export interface RoutineGroup {
  cliente: TrainerClient;
  rutinas: RoutineSummary[];
}

export interface RoutineExerciseDetail {
  id: number;
  ejercicioId: number;
  nombre: string;
  grupoMuscular: string | null;
  series: number | null;
  repeticiones: number | null;
  descansoSegundos: number | null;
  ordenVisual: number | null;
  observaciones: string | null;
}

export interface RoutineDetail {
  id: number;
  clienteId: number;
  cliente: { id: number; nombre: string; apellido: string };
  nombre: string;
  descripcion: string | null;
  objetivo: string | null;
  nivelDificultad: string | null;
  frecuenciaSemanal: number | null;
  duracionEstimada: number | null;
  activa: boolean;
  fechaAsignacion: string;
  diasSemana: number[];
  ejercicios: RoutineExerciseDetail[];
}

export interface RoutinePayload {
  clienteId?: number;
  nombre: string;
  descripcion?: string;
  objetivo?: string;
  nivelDificultad?: string;
  duracionEstimada?: number | null;
  activa: boolean;
  diasSemana: number[];
  ejercicios: Array<{
    ejercicioId: number;
    series?: number | null;
    repeticiones?: number | null;
    descansoSegundos?: number | null;
    observaciones?: string;
  }>;
}

export interface TrainerClass {
  id: number;
  nombre: string;
  sala: string | null;
  cupoMaximo: number;
  recurrente: boolean;
  fechaHora: string;
  duracionMinutos: number;
  horaFin: string;
  diasSemana: number[];
  inscriptos: number;
  porcentajeOcupacion: number;
}

export interface ClassConflict {
  claseId: number;
  nombre: string;
  profesor: string | null;
  sala: string | null;
  dias: number[];
  fecha: string | null;
  horaInicio: string;
  horaFin: string;
}

export interface ClassAvailability {
  disponible: boolean;
  error: 'SALA_OCUPADA' | 'PROFESOR_OCUPADO' | null;
  message: string | null;
  conflictos: ClassConflict[];
}

export type ClassSchedulePayload = Pick<ClassPayload, 'sala' | 'fechaHora' | 'horaFin' | 'recurrente' | 'diasSemana'> & {
  claseId?: number;
};

export interface ClassPayload {
  nombre: string;
  sala: string;
  cupoMaximo: number;
  recurrente: boolean;
  fechaHora: string;
  // Hora de fin (HH:mm, hora del gimnasio); el backend calcula la duración.
  horaFin: string;
  diasSemana: number[];
}

export interface RecipeCategory {
  id: number;
  nombre: string;
}

export interface TrainerRecipe {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoria: RecipeCategory;
  calorias: number | null;
  tiempoPreparacion: number | null;
  foto: string | null;
  ingredientes: Array<{ id: number; nombre: string; cantidad: string | null; unidad: string | null }>;
  pasos: Array<{ numeroPaso: number; descripcion: string }>;
}

export interface RecipePayload {
  nombre: string;
  categoriaRecetaId: number;
  descripcion?: string;
  calorias?: number | null;
  tiempoPreparacion?: number | null;
  ingredientes: Array<{ nombre: string; cantidad?: string | null; unidad?: string | null }>;
  pasos: Array<{ descripcion: string }>;
  quitarFoto?: boolean;
}

export interface TrainerProfile {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  especialidad: string | null;
  estadoCuenta: string;
  fechaAlta: string;
  clases: TrainerClass[];
}

export type NotificationFilter = 'todas' | 'no_leidas';

export interface TrainerNotification {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  fechaEnvio: string;
}

export interface NotificationList {
  items: TrainerNotification[];
  unreadCount: number;
}
