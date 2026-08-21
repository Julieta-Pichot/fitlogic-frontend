import axios from 'axios';
import type {
  ApiResponse,
  AuthUser,
  ChangePasswordPayload,
  LoginPayload,
  LoginResponse,
  SystemConfig,
} from '@/types';

const TOKEN_KEY = 'fitlogic_token';

export const buildBaseURL = () => {
  const envBase = import.meta.env.VITE_API_URL?.trim();

  if (envBase) {
    const trimmed = envBase.replace(/\/$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }

  return 'http://localhost:3001/api';
};

export const api = axios.create({
  baseURL: buildBaseURL(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let navigateFunction: ((path: string) => void) | null = null;

export const setNavigateFunction = (navigate: (path: string) => void) => {
  navigateFunction = navigate;
};

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);

export const setStoredToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem(TOKEN_KEY);
    delete api.defaults.headers.common.Authorization;
  }
};

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setStoredToken(null);

      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        if (navigateFunction) {
          navigateFunction('/login');
        } else {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export const authService = {
  login: async (payload: LoginPayload) => {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', payload);
    const token = response.data.data?.token;

    if (token) {
      setStoredToken(token);
    }

    return response.data;
  },

  me: async () => {
    const response = await api.get<ApiResponse<{ user: AuthUser }>>('/auth/me');
    return response.data;
  },

  changePassword: async (payload: ChangePasswordPayload) => {
    const response = await api.post<ApiResponse>('/auth/change-password', payload);
    return response.data;
  },

  logout: () => {
    setStoredToken(null);
  },
};

export const configService = {
  getSystem: async () => {
    const response = await api.get<ApiResponse<SystemConfig>>('/config/system');
    return response.data;
  },
};

export const plansService = {
  list: async () => {
    const response = await api.get<ApiResponse<any[]>>('/plans');
    return response.data.data ?? [];
  },
  create: async (payload: { nombre: string; duracionDias: number; precio: number }) => {
    const response = await api.post<ApiResponse>('/plans', payload);
    return response.data;
  },
  update: async (id: number, payload: Partial<{ nombre: string; duracionDias: number; precio: number; activo: 0 | 1 }>) => {
    const response = await api.patch<ApiResponse>(`/plans/${id}`, payload);
    return response.data;
  },
  toggleActive: async (id: number, activo: 0 | 1) => {
    const response = await api.patch<ApiResponse>(`/plans/${id}/active`, { activo });
    return response.data;
  },
  remove: async (id: number) => {
    const response = await api.delete<ApiResponse>(`/plans/${id}`);
    return response.data;
  },
};

export const productsService = {
  list: async () => {
    const response = await api.get<ApiResponse<any[]>>('/products');
    return response.data.data ?? [];
  },
  create: async (payload: { nombre: string; categoria?: string; precio: number; stock: number; descripcion?: string }) => {
    const response = await api.post<ApiResponse>('/products', payload);
    return response.data;
  },
  update: async (id: number, payload: Partial<{ nombre: string; categoria: string; precio: number; stock: number; descripcion: string; activo: 0 | 1 }>) => {
    const response = await api.patch<ApiResponse>(`/products/${id}`, payload);
    return response.data;
  },
  toggleActive: async (id: number, activo: 0 | 1) => {
    const response = await api.patch<ApiResponse>(`/products/${id}/active`, { activo });
    return response.data;
  },
  remove: async (id: number) => {
    const response = await api.delete<ApiResponse>(`/products/${id}`);
    return response.data;
  },
};

export const promotionsService = {
  list: async () => {
    const response = await api.get<ApiResponse<any[]>>('/promotions');
    return response.data.data ?? [];
  },
  create: async (payload: {
    nombre: string;
    descripcion?: string;
    descuentoPorcentaje: number;
    tipo: 1 | 2;
    fechaInicio?: string;
    fechaFin?: string;
    activo?: 0 | 1;
  }) => {
    const response = await api.post<ApiResponse>('/promotions', payload);
    return response.data;
  },
  update: async (id: number, payload: Partial<{
    nombre: string;
    descripcion: string;
    descuentoPorcentaje: number;
    tipo: 1 | 2;
    fechaInicio: string;
    fechaFin: string;
    activo: 0 | 1;
  }>) => {
    const response = await api.patch<ApiResponse>(`/promotions/${id}`, payload);
    return response.data;
  },
  toggleActive: async (id: number, activo: 0 | 1) => {
    const response = await api.patch<ApiResponse>(`/promotions/${id}/active`, { activo });
    return response.data;
  },
  remove: async (id: number) => {
    const response = await api.delete<ApiResponse>(`/promotions/${id}`);
    return response.data;
  },
};
