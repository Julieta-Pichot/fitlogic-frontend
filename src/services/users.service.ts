import { api } from '@/services/api';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type {
  CreateUserPayload,
  UpdateUserPayload,
  UserListParams,
  UserRecord,
} from '@/types/users';

export const usersService = {
  list: async (params: UserListParams) => {
    const response = await api.get<ApiResponse<PaginatedResponse<UserRecord>>>('/users', {
      params,
    });
    return response.data.data!;
  },

  getById: async (id: number) => {
    const response = await api.get<ApiResponse<UserRecord>>(`/users/${id}`);
    return response.data.data!;
  },

  create: async (payload: CreateUserPayload) => {
    const response = await api.post<ApiResponse<UserRecord>>('/users', payload);
    return response.data;
  },

  update: async (id: number, payload: UpdateUserPayload) => {
    const response = await api.patch<ApiResponse<UserRecord>>(`/users/${id}`, payload);
    return response.data;
  },

  toggleActive: async (id: number, activo: 0 | 1) => {
    const response = await api.patch<ApiResponse<UserRecord>>(`/users/${id}/active`, { activo });
    return response.data;
  },

  resetPassword: async (id: number, newPassword: string) => {
    const response = await api.post<ApiResponse>(`/users/${id}/reset-password`, { newPassword });
    return response.data;
  },
};
