import { api } from '@/services/api';

export type ExerciseRecord = { id: number; nombre: string; grupoMuscular: string | null };

export const routinesService = {
  listExercises: async () => {
    const response = await api.get<{ data: ExerciseRecord[] }>('/routines/exercises');
    return response.data.data ?? [];
  },
  listMine: async (history = false) => {
    const response = await api.get<{ data: RoutineRecord[] }>('/routines/me', history ? { params: { history: 'previous-month' } } : undefined);
    return response.data.data ?? [];
  },
  createExercise: async (nombre: string) => {
    const response = await api.post<{ data: ExerciseRecord }>('/routines/exercises', { nombre });
    return response.data.data!;
  },
  create: async (payload: {
    clienteId: number;
    nombre: string;
    descripcion?: string;
    objetivo?: string;
    diasSemana: number[];
    ejercicios: Array<{ ejercicioId: number; series?: number; repeticiones?: number }>;
  }) => {
    const response = await api.post<{ data: unknown }>('/routines', payload);
    return response.data.data!;
  },
};

export type RoutineRecord = {
  id: number;
  nombre: string;
  objetivo: string | null;
  descripcion: string | null;
  fechaAsignacion: string;
  dias: Array<{ diaSemana: number }>;
  ejercicios: Array<{ series: number | null; repeticiones: number | null; ejercicio: { nombre: string } }>;
};
