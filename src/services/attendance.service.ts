import { api } from '@/services/api';

export type AttendanceApiRecord = {
  id: number;
  clienteId: number;
  fechaHora: string;
  cliente: { usuario: { nombre: string; apellido: string } };
};

export const attendanceService = {
  list: async () => {
    const response = await api.get<{ data: AttendanceApiRecord[] }>('/attendance');
    return response.data.data ?? [];
  },
  register: async (clienteId: number) => {
    const response = await api.post<{ data: AttendanceApiRecord }>('/attendance', { clienteId });
    return response.data.data!;
  },
};
