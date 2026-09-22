import { api } from '@/services/api';

export type ClassRecord = {
  id: number;
  nombre: string;
  sala: string | null;
  cupoMaximo: number;
  recurrente: boolean;
  fechaHora: string;
  profesor: { usuario: { nombre: string; apellido: string } };
  inscripciones: Array<{ clienteId: number; estadoInscripcion: { nombre: string } }>;
  puntuaciones: Array<{ clienteId: number; puntuacion: number }>;
};

export const classesService = {
  listAvailable: async () => {
    const response = await api.get<{ data: ClassRecord[] }>('/classes/available');
    return response.data.data ?? [];
  },
  enroll: async (id: number) => {
    const response = await api.post(`/classes/${id}/enroll`);
    return response.data;
  },
  rate: async (id: number, puntuacion: number) => {
    const response = await api.post(`/classes/${id}/rate`, { puntuacion });
    return response.data;
  },
};
