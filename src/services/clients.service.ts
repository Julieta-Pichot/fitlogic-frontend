import { api } from '@/services/api';

export type ClientApiRecord = {
  id: number;
  usuarioId: number;
  estadoClienteId: number;
  estadoCliente: { id: number; nombre: string };
  objetivoEntrenamiento: string | null;
  aptoFisicoArchivo: string | null;
  aptoFisicoFechaCarga: string | null;
  aptoFisicoFechaVencimiento: string | null;
  cuotas: Array<{
    id: number;
    fechaVencimiento: string;
    plan: { id: number; nombre: string; precio: string | number };
    estadoCuota: { nombre: string };
  }>;
  usuario: { nombre: string; apellido: string; email: string; telefono: string | null };
};

export type CreateClientPayload = {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  telefono: string;
  objetivoEntrenamiento?: string;
  planId: number;
};

export type UpdateClientPayload = Partial<{
  nombre: string;
  apellido: string;
  telefono: string;
  objetivoEntrenamiento: string;
}>;

export const clientsService = {
  list: async (search?: string) => {
    const response = await api.get<{ data: ClientApiRecord[] }>('/clients', { params: search ? { search } : undefined });
    return response.data.data ?? [];
  },
  create: async (payload: CreateClientPayload) => {
    const response = await api.post<{ data: ClientApiRecord }>('/clients', payload);
    return response.data.data!;
  },
  update: async (id: number, payload: UpdateClientPayload) => {
    const response = await api.patch<{ data: ClientApiRecord }>(`/clients/${id}`, payload);
    return response.data.data!;
  },
  // Sube el archivo real; el backend fija fecha de carga (hoy) y vencimiento (+1 año).
  // El Content-Type multipart se declara explícito porque la instancia de axios fuerza JSON.
  uploadMedicalClearance: async (id: number, file: File) => {
    const formData = new FormData();
    formData.append('archivo', file);
    const response = await api.post<{ data: ClientApiRecord }>(`/clients/${id}/medical-clearance`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
    return response.data.data!;
  },
};
