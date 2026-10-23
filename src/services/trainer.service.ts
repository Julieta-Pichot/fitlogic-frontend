import { api, buildBaseURL } from '@/services/api';
import type { ApiResponse } from '@/types';
import type {
  CatalogExercise,
  ClassAvailability,
  ClassPayload,
  ClassSchedulePayload,
  CreatedExercise,
  NotificationFilter,
  NotificationList,
  RecipeCategory,
  RecipePayload,
  RoutineDetail,
  RoutineGroup,
  RoutinePayload,
  TrainerClass,
  TrainerClient,
  TrainerProfile,
  TrainerRecipe,
} from '@/types/trainer';

// Todas las rutas cuelgan de /api/profesor y el backend resuelve el profesor desde el token:
// el front nunca manda ni el id del profesor ni el del usuario.

const unwrap = <T>(response: { data: ApiResponse<T> }) => response.data.data as T;

// Las imágenes se guardan como ruta relativa (/uploads/recetas/xxx.png) servida por la API.
export const assetUrl = (path: string | null | undefined) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${buildBaseURL().replace(/\/api$/, '')}${path}`;
};

const multipartConfig = { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 30000 };

const buildRecipeForm = (payload: RecipePayload, photo: File | null) => {
  const form = new FormData();
  form.append('payload', JSON.stringify(payload));
  if (photo) form.append('foto', photo);
  return form;
};

export const trainerService = {
  listClients: async () => unwrap<TrainerClient[]>(await api.get('/profesor/clientes')),

  // Catálogo global de ejercicios (compartido entre profesores).
  listExercises: async () => unwrap<CatalogExercise[]>(await api.get('/ejercicios')),
  createExercise: async (nombre: string) => {
    const response = await api.post<ApiResponse<CreatedExercise>>('/ejercicios', { nombre });
    return { exercise: response.data.data as CreatedExercise, message: response.data.message };
  },

  listRoutines: async () => unwrap<RoutineGroup[]>(await api.get('/profesor/rutinas')),
  getRoutine: async (id: number) => unwrap<RoutineDetail>(await api.get(`/profesor/rutinas/${id}`)),
  createRoutine: async (payload: RoutinePayload) => unwrap<RoutineDetail>(await api.post('/profesor/rutinas', payload)),
  updateRoutine: async (id: number, payload: RoutinePayload) => unwrap<RoutineDetail>(await api.put(`/profesor/rutinas/${id}`, payload)),

  listClasses: async () => unwrap<TrainerClass[]>(await api.get('/profesor/clases')),
  createClass: async (payload: ClassPayload) => unwrap<TrainerClass>(await api.post('/profesor/clases', payload)),
  updateClass: async (id: number, payload: ClassPayload) => unwrap<TrainerClass>(await api.put(`/profesor/clases/${id}`, payload)),
  checkClassAvailability: async (payload: ClassSchedulePayload) =>
    unwrap<ClassAvailability>(await api.post('/profesor/clases/disponibilidad', payload)),
  deleteClass: async (id: number) => unwrap<{ id: number; inscriptosEliminados: number }>(await api.delete(`/profesor/clases/${id}`)),

  listRecipeCategories: async () => unwrap<RecipeCategory[]>(await api.get('/profesor/categorias-receta')),
  listRecipes: async () => unwrap<TrainerRecipe[]>(await api.get('/profesor/recetas')),
  createRecipe: async (payload: RecipePayload, photo: File | null) =>
    unwrap<TrainerRecipe>(await api.post('/profesor/recetas', buildRecipeForm(payload, photo), multipartConfig)),
  updateRecipe: async (id: number, payload: RecipePayload, photo: File | null) =>
    unwrap<TrainerRecipe>(await api.put(`/profesor/recetas/${id}`, buildRecipeForm(payload, photo), multipartConfig)),
  deleteRecipe: async (id: number) => unwrap<{ id: number }>(await api.delete(`/profesor/recetas/${id}`)),

  getProfile: async () => unwrap<TrainerProfile>(await api.get('/profesor/perfil')),
  changePassword: async (payload: { currentPassword: string; newPassword: string }) => {
    const response = await api.put<ApiResponse>('/profesor/perfil/password', payload);
    return response.data;
  },

  listNotifications: async (filtro: NotificationFilter) =>
    unwrap<NotificationList>(await api.get('/profesor/notificaciones', { params: { filtro } })),
  markNotificationRead: async (id: number) => unwrap<{ id: number }>(await api.patch(`/profesor/notificaciones/${id}/leida`)),
  markAllNotificationsRead: async () => unwrap<{ actualizadas: number }>(await api.patch('/profesor/notificaciones/leidas')),
};
