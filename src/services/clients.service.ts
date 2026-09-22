import { api } from '@/services/api';

export type ClientApiRecord = {
  id: number;
  usuarioId: number;
  estadoClienteId: number;
  estadoCliente: { id: number; nombre: string };
  objetivoEntrenamiento: string | null;
  aptoFisicoArchivo: string | null;
  aptoFisicoFechaVencimiento: string | null;
  cuotas: Array<{
    id: number;
    fechaVencimiento: string;
    plan: { nombre: string; precio: string | number };
    estadoCuota: { nombre: string };
  }>;
  usuario: { nombre: string; apellido: string; email: string; telefono: string | null };
};

export const clientsService = {
  list: async (search?: string) => {
    const response = await api.get<{ data: ClientApiRecord[] }>('/clients', { params: search ? { search } : undefined });
    return response.data.data ?? [];
  },
  create: async (payload: {
    nombre: string;
    apellido: string;
    email: string;
    password: string;
    telefono?: string;
    objetivoEntrenamiento?: string;
  }) => {
    const response = await api.post<{ data: ClientApiRecord }>('/clients', payload);
    return response.data.data!;
  },
  updateMedicalClearance: async (id: number, archivo: string) => {
    const response = await api.put<{ data: ClientApiRecord }>(`/clients/${id}/medical-clearance`, { archivo });
    return response.data.data!;
  },
};
