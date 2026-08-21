export type UserRole = 'cliente' | 'profesor' | 'recepcionista' | 'admin';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{ msg: string; path?: string }>;
}

export interface AuthUser {
  id: number;
  gimnasioId: number;
  rolId: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  activo: number;
  fechaCreacion: string;
  roleKey: UserRole | null;
  roleName: string | null;
  gimnasioCodigo: string | null;
  gimnasioNombre: string | null;
  profile: {
    cliente: Record<string, unknown> | null;
    profesor: Record<string, unknown> | null;
    recepcionista: Record<string, unknown> | null;
  };
}

export interface LoginPayload {
  codigoGimnasio: string;
  email: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  message?: string;
  user?: AuthUser | null;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface SystemConfig {
  roles: Array<{ id: number; nombre: string }>;
  estadosCliente: Array<{ id: number; nombre: string | null }>;
  estadosCuota: Array<{ id: number; nombre: string | null }>;
  metodosPago: Record<string, number>;
  estadosPago: Record<string, number>;
  roleIds: Record<string, number>;
}
