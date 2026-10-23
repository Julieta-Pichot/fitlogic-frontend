import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, ArrowDown, ArrowUp, Check, Plus, Search, X } from "lucide-react"
import toast from "react-hot-toast"
import { Modal } from "@/components/ui"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ClientSelect, type ClientOption } from "@/components/receptionist/client-select"
import { trainerService } from "@/services/trainer.service"
import { getErrorMessage } from "@/utils/get-error-message"
import { DAY_LETTERS, DAY_NAMES } from "@/utils/gym-time"
import type { CatalogExercise, RoutineDetail, RoutinePayload } from "@/types/trainer"
import { fieldClass, labelClass } from "./styles"

const ROUTINE_CATEGORIES = ["Fuerza", "Cardio", "Flexibilidad", "Funcional", "Movilidad"]
const MUSCLE_GROUPS = ["Pecho", "Espalda", "Piernas", "Hombros", "Brazos", "Abdomen", "Glúteos"]
const LEVELS = ["Principiante", "Intermedio", "Avanzado"]

type ExerciseRow = {
  ejercicioId: number
  nombre: string
  grupoMuscular: string | null
  series: string
  repeticiones: string
  descanso: string
  observaciones: string
}

const stripAccents = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

// objetivo = "Categoría" o "Fuerza: Pecho, Espalda" (categoría + grupos musculares)
const buildObjective = (category: string, muscles: string[]) =>
  category === "Fuerza" && muscles.length > 0 ? `Fuerza: ${muscles.join(", ")}` : category

const parseObjective = (objective: string | null) => {
  if (!objective) return { category: "Fuerza", muscles: [] as string[] }
  const [category, rest] = objective.split(":")
  return {
    category: category.trim() || "Fuerza",
    muscles: rest ? rest.split(",").map((item) => item.trim()).filter(Boolean) : [],
  }
}

const toNumber = (value: string) => {
  const trimmed = value.trim()
  return trimmed === "" ? null : Number(trimmed)
}

interface RoutineFormModalProps {
  // Si viene un id se edita esa rutina; si no, se crea una nueva.
  routineId?: number | null
  onClose: () => void
}

export function RoutineFormModal({ routineId = null, onClose }: RoutineFormModalProps) {
  const detail = useQuery({
    queryKey: ["trainer", "routine", routineId],
    queryFn: () => trainerService.getRoutine(routineId as number),
    enabled: routineId !== null,
    staleTime: 0,
  })

  const isEditing = routineId !== null

  return (
    <Modal
      open
      onClose={onClose}
      title={isEditing ? "Editar rutina" : "Nueva rutina"}
      description={isEditing ? "Modificá los datos, ejercicios y días de la rutina" : "Asigná una rutina a un alumno"}
      className="max-w-xl"
    >
      {isEditing && !detail.isFetchedAfterMount && !detail.isError ? (
        <LoadingSpinner label="Cargando rutina..." />
      ) : isEditing && (detail.isError || !detail.data) ? (
        <div className="space-y-3 py-6 text-center">
          <p className="text-sm text-red-500">{getErrorMessage(detail.error, "No se pudo cargar la rutina")}</p>
          <button type="button" onClick={() => detail.refetch()} className="text-sm font-medium text-primary hover:underline">
            Reintentar
          </button>
        </div>
      ) : (
        <RoutineForm initial={detail.data ?? null} onClose={onClose} />
      )}
    </Modal>
  )
}

function RoutineForm({ initial, onClose }: { initial: RoutineDetail | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const isEditing = initial !== null

  const clientsQuery = useQuery({ queryKey: ["trainer", "clients"], queryFn: trainerService.listClients, staleTime: 60_000 })
  const exercisesQuery = useQuery({ queryKey: ["trainer", "exercises"], queryFn: trainerService.listExercises, staleTime: 60_000 })

  const parsedObjective = useMemo(() => parseObjective(initial?.objetivo ?? null), [initial])

  const [clientId, setClientId] = useState<number | null>(initial?.clienteId ?? null)
  const [name, setName] = useState(initial?.nombre ?? "")
  const [notes, setNotes] = useState(initial?.descripcion ?? "")
  const [category, setCategory] = useState(parsedObjective.category)
  const [muscles, setMuscles] = useState<string[]>(parsedObjective.muscles)
  const [level, setLevel] = useState(initial?.nivelDificultad ?? "")
  const [duration, setDuration] = useState(initial?.duracionEstimada ? String(initial.duracionEstimada) : "")
  const [active, setActive] = useState(initial?.activa ?? true)
  const [days, setDays] = useState<number[]>(initial?.diasSemana ?? [])
  const [rows, setRows] = useState<ExerciseRow[]>(
    () =>
      initial?.ejercicios.map((item) => ({
        ejercicioId: item.ejercicioId,
        nombre: item.nombre,
        grupoMuscular: item.grupoMuscular,
        series: item.series?.toString() ?? "",
        repeticiones: item.repeticiones?.toString() ?? "",
        descanso: item.descansoSegundos?.toString() ?? "",
        observaciones: item.observaciones ?? "",
      })) ?? []
  )
  const [exerciseQuery, setExerciseQuery] = useState("")
  const [newExercise, setNewExercise] = useState("")
  const [errors, setErrors] = useState<string[]>([])

  const clientOptions: ClientOption[] = useMemo(
    () =>
      (clientsQuery.data ?? []).map((client) => ({
        id: client.id,
        label: `${client.apellido}, ${client.nombre}`,
        hint: client.estado === "HABILITADO" ? undefined : client.estado.replace(/_/g, " ").toLowerCase(),
      })),
    [clientsQuery.data]
  )

  const categoryOptions = ROUTINE_CATEGORIES.includes(category) ? ROUTINE_CATEGORIES : [...ROUTINE_CATEGORIES, category]

  const filteredCatalog = useMemo(() => {
    const term = stripAccents(exerciseQuery.trim())
    const catalog = exercisesQuery.data ?? []
    if (!term) return catalog
    return catalog.filter((item) => stripAccents(`${item.nombre} ${item.grupoMuscular ?? ""}`).includes(term))
  }, [exercisesQuery.data, exerciseQuery])

  const toggleDay = (day: number) =>
    setDays((prev) => (prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day].sort((a, b) => a - b)))

  const toggleMuscle = (muscle: string) =>
    setMuscles((prev) => (prev.includes(muscle) ? prev.filter((item) => item !== muscle) : [...prev, muscle]))

  const addExercise = (exercise: CatalogExercise) =>
    setRows((prev) =>
      prev.some((row) => row.ejercicioId === exercise.id)
        ? prev
        : [
            ...prev,
            {
              ejercicioId: exercise.id,
              nombre: exercise.nombre,
              grupoMuscular: exercise.grupoMuscular,
              series: "3",
              repeticiones: "12",
              descanso: "",
              observaciones: "",
            },
          ]
    )

  const toggleExercise = (exercise: CatalogExercise) =>
    rows.some((row) => row.ejercicioId === exercise.id)
      ? setRows((prev) => prev.filter((row) => row.ejercicioId !== exercise.id))
      : addExercise(exercise)

  const updateRow = (ejercicioId: number, field: keyof ExerciseRow, value: string) =>
    setRows((prev) => prev.map((row) => (row.ejercicioId === ejercicioId ? { ...row, [field]: value } : row)))

  const moveRow = (index: number, direction: -1 | 1) =>
    setRows((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })

  const createExercise = useMutation({
    mutationFn: (exerciseName: string) => trainerService.createExercise(exerciseName),
    onSuccess: ({ exercise }) => {
      addExercise(exercise)
      setNewExercise("")
      queryClient.invalidateQueries({ queryKey: ["trainer", "exercises"] })
      toast.success(exercise.existente ? `«${exercise.nombre}» ya existía en el catálogo: se agregó a la rutina` : `«${exercise.nombre}» creado y agregado a la rutina`)
    },
    onError: (error) => toast.error(getErrorMessage(error, "No se pudo crear el ejercicio")),
  })

  const handleCreateExercise = () => {
    const exerciseName = newExercise.trim()
    if (!exerciseName) {
      toast.error("Escribí el nombre del ejercicio")
      return
    }
    createExercise.mutate(exerciseName)
  }

  const save = useMutation({
    mutationFn: (payload: RoutinePayload) =>
      isEditing ? trainerService.updateRoutine(initial.id, payload) : trainerService.createRoutine(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer", "routines"] })
      if (isEditing) queryClient.invalidateQueries({ queryKey: ["trainer", "routine", initial.id] })
      toast.success(isEditing ? "Rutina actualizada correctamente" : "Rutina creada correctamente")
      onClose()
    },
    onError: (error) => setErrors([getErrorMessage(error, "No se pudo guardar la rutina")]),
  })

  const handleSubmit = () => {
    const problems: string[] = []
    if (!isEditing && !clientId) problems.push("Elegí un alumno.")
    if (!name.trim()) problems.push("Ingresá un nombre para la rutina.")
    if (days.length === 0) problems.push("Elegí al menos un día de la semana.")
    if (rows.length === 0) problems.push("Agregá al menos un ejercicio.")
    for (const row of rows) {
      const series = toNumber(row.series)
      const reps = toNumber(row.repeticiones)
      const rest = toNumber(row.descanso)
      if ((series !== null && (!Number.isInteger(series) || series < 1)) || (reps !== null && (!Number.isInteger(reps) || reps < 1))) {
        problems.push(`«${row.nombre}»: series y repeticiones deben ser números enteros mayores a 0.`)
      }
      if (rest !== null && (!Number.isInteger(rest) || rest < 0)) problems.push(`«${row.nombre}»: el descanso debe ser un número de segundos.`)
    }
    const minutes = toNumber(duration)
    if (minutes !== null && (!Number.isInteger(minutes) || minutes < 1)) problems.push("La duración debe ser un número de minutos mayor a 0.")

    setErrors(problems)
    if (problems.length > 0) return

    save.mutate({
      ...(isEditing ? {} : { clienteId: clientId as number }),
      nombre: name.trim(),
      descripcion: notes.trim(),
      objetivo: buildObjective(category, muscles),
      nivelDificultad: level,
      duracionEstimada: minutes,
      activa: active,
      diasSemana: days,
      ejercicios: rows.map((row) => ({
        ejercicioId: row.ejercicioId,
        series: toNumber(row.series),
        repeticiones: toNumber(row.repeticiones),
        descansoSegundos: toNumber(row.descanso),
        observaciones: row.observaciones.trim(),
      })),
    })
  }

  const clientLabel = initial ? `${initial.cliente.apellido}, ${initial.cliente.nombre}` : ""

  return (
    <div className="space-y-5">
      {/* Alumno */}
      <div className="space-y-2">
        <label className={labelClass}>Alumno</label>
        {isEditing ? (
          <input type="text" value={clientLabel} disabled className={`${fieldClass} opacity-70`} />
        ) : clientsQuery.isError ? (
          <p className="text-sm text-red-500">
            {getErrorMessage(clientsQuery.error, "No se pudieron cargar los alumnos")}{" "}
            <button type="button" onClick={() => clientsQuery.refetch()} className="font-medium underline">
              Reintentar
            </button>
          </p>
        ) : (
          <ClientSelect
            options={clientOptions}
            value={clientId}
            onChange={setClientId}
            disabled={clientsQuery.isLoading}
            placeholder={clientsQuery.isLoading ? "Cargando alumnos..." : "Seleccioná un alumno (podés escribir para filtrar)"}
          />
        )}
        {!isEditing && !clientsQuery.isLoading && !clientsQuery.isError && clientOptions.length === 0 && (
          <p className="text-xs text-muted-foreground">Todavía no hay alumnos registrados.</p>
        )}
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Nombre de la rutina</label>
        <input
          type="text"
          value={name}
          maxLength={150}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ej: Tren superior - Día A"
          className={fieldClass}
        />
      </div>

      {/* Días */}
      <div className="space-y-2">
        <label className={labelClass}>Días de la semana</label>
        <div className="flex flex-wrap gap-2">
          {DAY_LETTERS.map((letter, index) => {
            const day = index + 1
            const selected = days.includes(day)
            return (
              <button
                key={day}
                type="button"
                aria-pressed={selected}
                title={DAY_NAMES[index]}
                onClick={() => toggleDay(day)}
                className={`h-10 w-10 rounded-xl font-medium transition-colors ${
                  selected ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/70"
                }`}
              >
                {letter}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Un día no puede repetirse en dos rutinas activas del mismo alumno.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className={labelClass}>Categoría</label>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className={fieldClass}>
            {categoryOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className={labelClass}>Nivel</label>
          <select value={level} onChange={(event) => setLevel(event.target.value)} className={fieldClass}>
            <option value="">Sin especificar</option>
            {LEVELS.map((option) => (
              <option key={option}>{option}</option>
            ))}
            {level && !LEVELS.includes(level) && <option>{level}</option>}
          </select>
        </div>
      </div>

      {category === "Fuerza" && (
        <div className="space-y-2">
          <label className={labelClass}>Grupos musculares</label>
          <p className="text-xs text-muted-foreground">Podés seleccionar uno o más para el mismo día</p>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_GROUPS.map((muscle) => {
              const selected = muscles.includes(muscle)
              return (
                <button
                  key={muscle}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleMuscle(muscle)}
                  className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    selected ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/70"
                  }`}
                >
                  {muscle}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className={labelClass}>Duración estimada (min)</label>
          <input
            type="number"
            min={1}
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            placeholder="60"
            className={fieldClass}
          />
        </div>
        <label className="flex cursor-pointer items-center justify-between gap-3 self-end rounded-xl bg-secondary px-4 py-3">
          <span>
            <span className="block text-sm font-medium text-foreground">Rutina activa</span>
            <span className="block text-xs text-muted-foreground">{active ? "Visible para el alumno" : "Desactivada"}</span>
          </span>
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
            className="h-5 w-5 accent-primary"
          />
        </label>
      </div>

      {/* Ejercicios */}
      <div className="space-y-3">
        <label className={labelClass}>Ejercicios</label>

        {rows.length > 0 && (
          <ul className="space-y-2">
            {rows.map((row, index) => (
              <li key={row.ejercicioId} className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{row.nombre}</p>
                    {row.grupoMuscular && <p className="text-xs text-muted-foreground">{row.grupoMuscular}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => moveRow(index, -1)}
                    disabled={index === 0}
                    aria-label={`Subir ${row.nombre}`}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-card hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveRow(index, 1)}
                    disabled={index === rows.length - 1}
                    aria-label={`Bajar ${row.nombre}`}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-card hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRows((prev) => prev.filter((item) => item.ejercicioId !== row.ejercicioId))}
                    aria-label={`Quitar ${row.nombre}`}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["series", "Series"],
                      ["repeticiones", "Repeticiones"],
                      ["descanso", "Descanso (seg)"],
                    ] as const
                  ).map(([field, label]) => (
                    <div key={field} className="space-y-1">
                      <label className="text-xs text-muted-foreground">{label}</label>
                      <input
                        type="number"
                        min={field === "descanso" ? 0 : 1}
                        value={row[field]}
                        onChange={(event) => updateRow(row.ejercicioId, field, event.target.value)}
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  ))}
                </div>
                <input
                  type="text"
                  value={row.observaciones}
                  onChange={(event) => updateRow(row.ejercicioId, "observaciones", event.target.value)}
                  placeholder="Observaciones (opcional)"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </li>
            ))}
          </ul>
        )}

        {/* Buscador + catálogo compartido */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={exerciseQuery}
            onChange={(event) => setExerciseQuery(event.target.value)}
            placeholder="Buscar ejercicio..."
            className="w-full rounded-xl border border-border bg-secondary py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="max-h-52 divide-y divide-border overflow-y-auto rounded-xl border border-border bg-secondary">
          {exercisesQuery.isLoading ? (
            <p className="p-3 text-center text-sm text-muted-foreground">Cargando ejercicios...</p>
          ) : exercisesQuery.isError ? (
            <p className="p-3 text-center text-sm text-red-500">
              {getErrorMessage(exercisesQuery.error, "No se pudo cargar el catálogo")}{" "}
              <button type="button" onClick={() => exercisesQuery.refetch()} className="font-medium underline">
                Reintentar
              </button>
            </p>
          ) : filteredCatalog.length === 0 ? (
            <p className="p-3 text-center text-sm text-muted-foreground">
              Sin resultados. Podés crearlo abajo con «Crear y agregar».
            </p>
          ) : (
            filteredCatalog.map((exercise) => {
              const selected = rows.some((row) => row.ejercicioId === exercise.id)
              return (
                <button
                  key={exercise.id}
                  type="button"
                  onClick={() => toggleExercise(exercise)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-card/60"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-foreground">{exercise.nombre}</span>
                    {exercise.grupoMuscular && <span className="block text-xs text-muted-foreground">{exercise.grupoMuscular}</span>}
                  </span>
                  <span
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg ${
                      selected ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
                    }`}
                  >
                    {selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </span>
                </button>
              )
            })
          )}
        </div>

        {/* Nuevo ejercicio */}
        <div className="space-y-2 rounded-xl border border-primary/30 bg-secondary p-3">
          <label className="text-xs font-medium text-foreground">Nuevo ejercicio</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newExercise}
              maxLength={150}
              onChange={(event) => setNewExercise(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  handleCreateExercise()
                }
              }}
              placeholder="Ej: Hip Thrust con Barra"
              className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={handleCreateExercise}
              disabled={createExercise.isPending || !newExercise.trim()}
              className="flex-shrink-0 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {createExercise.isPending ? "Creando..." : "Crear y agregar"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Queda disponible en el catálogo para todos los profesores. Si ya existe, se reutiliza.
          </p>
        </div>

        <p className="text-xs text-muted-foreground">{rows.length} ejercicio(s) en la rutina</p>
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Notas de la rutina</label>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          placeholder="Objetivo, progresos, restricciones y observaciones..."
          className={`${fieldClass} resize-none`}
        />
      </div>

      {errors.length > 0 && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
          <ul className="space-y-1 text-sm text-red-500">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onClose}
          disabled={save.isPending}
          className="flex-1 rounded-xl bg-secondary py-3 font-medium text-foreground transition-colors hover:bg-secondary/70 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={save.isPending}
          className="flex-[2] rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {save.isPending ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear rutina"}
        </button>
      </div>
    </div>
  )
}
