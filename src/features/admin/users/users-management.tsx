import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, Plus, Trash2, UserCog, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  PageLoader,
  Pagination,
  RoleBadge,
  SearchInput,
  SelectFilter,
  StatusBadge,
} from '@/components/ui';
import { useDebounce } from '@/hooks/use-debounce';
import { usePagination } from '@/hooks/use-pagination';
import { usersService } from '@/services/users.service';
import type { CreateUserPayload, UpdateUserPayload, UserRecord } from '@/types/users';
import { ROLE_OPTIONS, TRAINER_SPECIALTIES } from '@/types/users';
import { getFullName } from '@/utils/formatters';
import { getErrorMessage } from '@/utils/get-error-message';

const ROLE_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos los roles' },
  { value: '2', label: 'Profesores' },
  { value: '3', label: 'Recepcionistas' },
  { value: '4', label: 'Clientes' },
];

const emptyCreateForm = (): CreateUserPayload => ({
  nombre: '',
  apellido: '',
  email: '',
  password: '',
  telefono: '',
  rolId: 2,
  especialidades: [],
  objetivoDiasSemana: 3,
});

export function UsersManagement() {
  const queryClient = useQueryClient();
  const { page, params, setPage, resetPage } = usePagination();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const debouncedSearch = useDebounce(search);

  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [toggleTarget, setToggleTarget] = useState<UserRecord | null>(null);
  const [createForm, setCreateForm] = useState<CreateUserPayload>(emptyCreateForm);
  const [editForm, setEditForm] = useState<UpdateUserPayload>({});

  useEffect(() => {
    resetPage();
  }, [debouncedSearch, roleFilter, resetPage]);

  const listParams = useMemo(
    () => ({
      ...params,
      search: debouncedSearch || undefined,
      rolId: roleFilter === 'all' ? undefined : Number(roleFilter),
    }),
    [params, debouncedSearch, roleFilter]
  );

  const usersQuery = useQuery({
    queryKey: ['users', listParams],
    queryFn: () => usersService.list(listParams),
  });

  const createMutation = useMutation({
    mutationFn: usersService.create,
    onSuccess: (response) => {
      toast.success(response.message ?? 'Usuario creado correctamente');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowCreate(false);
      setCreateForm(emptyCreateForm());
    },
    onError: (error) => toast.error(getErrorMessage(error, 'No se pudo crear el usuario')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateUserPayload }) =>
      usersService.update(id, payload),
    onSuccess: (response) => {
      toast.success(response.message ?? 'Usuario actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditUser(null);
    },
    onError: (error) => toast.error(getErrorMessage(error, 'No se pudo actualizar el usuario')),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: 0 | 1 }) =>
      usersService.toggleActive(id, activo),
    onSuccess: (response) => {
      toast.success(response.message ?? 'Estado actualizado');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setToggleTarget(null);
    },
    onError: (error) => toast.error(getErrorMessage(error, 'No se pudo cambiar el estado')),
  });

  const openEdit = (user: UserRecord) => {
    setEditUser(user);
    setEditForm({
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      telefono: user.telefono,
      rolId: user.rolId,
      especialidades: user.especialidades,
      objetivoDiasSemana:
        (user.profile.cliente as { objetivoDiasSemana?: number } | null)?.objetivoDiasSemana ?? 3,
    });
  };

  const toggleSpecialty = (specialties: string[], specialty: string) =>
    specialties.includes(specialty)
      ? specialties.filter((item) => item !== specialty)
      : [...specialties, specialty];

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    createMutation.mutate({
      ...createForm,
      telefono: createForm.telefono?.trim() || undefined,
      especialidades:
        createForm.rolId === 2 ? createForm.especialidades : undefined,
      objetivoDiasSemana:
        createForm.rolId === 4 ? createForm.objetivoDiasSemana : undefined,
    });
  };

  const handleUpdate = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editUser) return;

    updateMutation.mutate({
      id: editUser.id,
      payload: {
        ...editForm,
        telefono: editForm.telefono?.trim() || null,
        especialidades: editForm.rolId === 2 ? editForm.especialidades : undefined,
        objetivoDiasSemana:
          editForm.rolId === 4 ? editForm.objetivoDiasSemana : undefined,
      },
    });
  };

  const users = usersQuery.data?.items ?? [];
  const pagination = usersQuery.data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuarios</h1>
          <p className="mt-1 text-muted-foreground">Gestiona todos los usuarios del gimnasio</p>
        </div>
        <Button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-5 w-5" />
          Nuevo Usuario
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar usuario..."
          className="flex-1"
        />
        <SelectFilter
          value={roleFilter}
          onChange={setRoleFilter}
          options={ROLE_FILTER_OPTIONS}
          className="sm:w-56"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {usersQuery.isLoading ? (
          <PageLoader />
        ) : usersQuery.isError ? (
          <EmptyState
            title="No se pudieron cargar los usuarios"
            description={getErrorMessage(usersQuery.error)}
            actionLabel="Reintentar"
            onAction={() => usersQuery.refetch()}
          />
        ) : users.length === 0 ? (
          <EmptyState
            title="No hay usuarios"
            description="Creá el primer usuario del gimnasio para comenzar."
            actionLabel="Nuevo Usuario"
            onAction={() => setShowCreate(true)}
            icon={<Users className="h-10 w-10" />}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Usuario</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Email</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Rol</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Estado</th>
                    <th className="p-4 text-right text-sm font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((user) => {
                    const fullName = getFullName(user.nombre, user.apellido);

                    return (
                      <tr key={user.id} className="transition-colors hover:bg-secondary/30">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary font-medium text-foreground">
                              {user.nombre.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{fullName}</p>
                              {user.telefono ? (
                                <p className="text-xs text-muted-foreground">{user.telefono}</p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">{user.email}</td>
                        <td className="p-4">
                          <RoleBadge roleKey={user.roleKey} />
                        </td>
                        <td className="p-4">
                          <StatusBadge active={user.activo === 1} />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              onClick={() => openEdit(user)}
                              className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-sm text-foreground hover:bg-secondary/80"
                            >
                              <UserCog className="h-4 w-4" />
                              Editar
                            </Button>
                            {user.roleKey !== 'admin' ? (
                              <Button
                                type="button"
                                aria-label={user.activo === 1 ? 'Desactivar usuario' : 'Activar usuario'}
                                onClick={() => setToggleTarget(user)}
                                className="rounded-lg p-2 hover:bg-red-500/10"
                              >
                                {user.activo === 1 ? (
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                ) : (
                                  <Edit className="h-4 w-4 text-green-500" />
                                )}
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {pagination ? (
              <div className="border-t border-border p-4">
                <Pagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  total={pagination.total}
                  onPageChange={setPage}
                />
              </div>
            ) : null}
          </>
        )}
      </div>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nuevo Usuario"
        description="Creá un usuario del staff o un cliente con acceso al sistema."
        footer={
          <Button
            type="submit"
            form="create-user-form"
            disabled={createMutation.isPending}
            className="w-full bg-primary py-3 text-primary-foreground hover:bg-primary/90"
          >
            {createMutation.isPending ? 'Creando...' : 'Crear Usuario'}
          </Button>
        }
      >
        <form id="create-user-form" className="space-y-4" onSubmit={handleCreate}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Nombre</span>
              <Input
                required
                value={createForm.nombre}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, nombre: event.target.value }))}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Apellido</span>
              <Input
                required
                value={createForm.apellido}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, apellido: event.target.value }))}
              />
            </label>
          </div>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Email</span>
            <Input
              required
              type="email"
              value={createForm.email}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Teléfono</span>
            <Input
              value={createForm.telefono ?? ''}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, telefono: event.target.value }))}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Rol</span>
            <select
              value={createForm.rolId}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  rolId: Number(event.target.value),
                  especialidades: [],
                }))
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
          {createForm.rolId === 2 ? (
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Especialidades</span>
              <div className="flex flex-wrap gap-2">
                {TRAINER_SPECIALTIES.map((specialty) => {
                  const selected = createForm.especialidades?.includes(specialty);
                  return (
                    <button
                      key={specialty}
                      type="button"
                      onClick={() =>
                        setCreateForm((prev) => ({
                          ...prev,
                          especialidades: toggleSpecialty(prev.especialidades ?? [], specialty),
                        }))
                      }
                      className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                        selected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {specialty}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          {createForm.rolId === 4 ? (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Objetivo semanal (días)</span>
              <Input
                type="number"
                min={1}
                max={7}
                value={createForm.objetivoDiasSemana ?? 3}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    objetivoDiasSemana: Number(event.target.value),
                  }))
                }
              />
            </label>
          ) : null}
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Contraseña temporal</span>
            <Input
              required
              type="password"
              minLength={6}
              value={createForm.password}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
            />
          </label>
        </form>
      </Modal>

      <Modal
        open={Boolean(editUser)}
        onClose={() => setEditUser(null)}
        title="Editar Usuario"
        description={editUser ? getFullName(editUser.nombre, editUser.apellido) : undefined}
        footer={
          <Button
            type="submit"
            form="edit-user-form"
            disabled={updateMutation.isPending}
            className="w-full bg-primary py-3 text-primary-foreground hover:bg-primary/90"
          >
            {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        }
      >
        <form id="edit-user-form" className="space-y-4" onSubmit={handleUpdate}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Nombre</span>
              <Input
                required
                value={editForm.nombre ?? ''}
                onChange={(event) => setEditForm((prev) => ({ ...prev, nombre: event.target.value }))}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Apellido</span>
              <Input
                required
                value={editForm.apellido ?? ''}
                onChange={(event) => setEditForm((prev) => ({ ...prev, apellido: event.target.value }))}
              />
            </label>
          </div>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Email</span>
            <Input
              required
              type="email"
              value={editForm.email ?? ''}
              onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Teléfono</span>
            <Input
              value={editForm.telefono ?? ''}
              onChange={(event) => setEditForm((prev) => ({ ...prev, telefono: event.target.value }))}
            />
          </label>
          {editUser?.roleKey !== 'admin' ? (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Rol</span>
              <select
                value={editForm.rolId}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    rolId: Number(event.target.value),
                    especialidades: prev.especialidades ?? [],
                  }))
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {editForm.rolId === 2 ? (
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Especialidades</span>
              <div className="flex flex-wrap gap-2">
                {TRAINER_SPECIALTIES.map((specialty) => {
                  const selected = editForm.especialidades?.includes(specialty);
                  return (
                    <button
                      key={specialty}
                      type="button"
                      onClick={() =>
                        setEditForm((prev) => ({
                          ...prev,
                          especialidades: toggleSpecialty(prev.especialidades ?? [], specialty),
                        }))
                      }
                      className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                        selected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {specialty}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toggleTarget)}
        title={toggleTarget?.activo === 1 ? 'Desactivar usuario' : 'Activar usuario'}
        description={
          toggleTarget
            ? toggleTarget.activo === 1
              ? `¿Desactivar a ${getFullName(toggleTarget.nombre, toggleTarget.apellido)}? No podrá iniciar sesión.`
              : `¿Reactivar a ${getFullName(toggleTarget.nombre, toggleTarget.apellido)}?`
            : ''
        }
        confirmLabel={toggleTarget?.activo === 1 ? 'Desactivar' : 'Activar'}
        destructive={toggleTarget?.activo === 1}
        loading={toggleMutation.isPending}
        onCancel={() => setToggleTarget(null)}
        onConfirm={() => {
          if (!toggleTarget) return;
          toggleMutation.mutate({
            id: toggleTarget.id,
            activo: toggleTarget.activo === 1 ? 0 : 1,
          });
        }}
      />
    </div>
  );
}
