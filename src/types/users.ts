import type { UserRole } from './auth';

export interface UserRecord {
  id: number;
  gimnasioId: number;
  rolId: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  activo: number;
  fechaCreacion: string;
  fechaActualizacion: string;
  fechaEliminacion: string | null;
  roleKey: UserRole | null;
  roleName: string | null;
  gimnasioCodigo: string | null;
  gimnasioNombre: string | null;
  especialidades: string[];
  profile: {
    cliente: unknown | null;
    profesor: unknown | null;
    recepcionista: unknown | null;
  };
}

export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  rolId?: number;
  activo?: 0 | 1;
  sortBy?: 'nombre' | 'apellido' | 'email' | 'fechaCreacion';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateUserPayload {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  telefono?: string;
  rolId: number;
  especialidades?: string[];
  objetivoDiasSemana?: number;
}

export interface UpdateUserPayload {
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string | null;
  rolId?: number;
  especialidades?: string[];
  objetivoDiasSemana?: number;
}

export const ROLE_OPTIONS = [
  { id: 2, label: 'Profesor', key: 'profesor' as const },
  { id: 3, label: 'Recepcionista', key: 'recepcionista' as const },
  { id: 4, label: 'Cliente', key: 'cliente' as const },
];

export const TRAINER_SPECIALTIES = [
  'Musculación',
  'Funcional',
  'Cross Training',
  'Cardio',
  'Spinning',
  'Yoga',
  'Pilates',
  'Boxeo',
];
