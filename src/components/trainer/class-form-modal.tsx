import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import { Modal } from "@/components/ui"
import { useDebounce } from "@/hooks/use-debounce"
import { trainerService } from "@/services/trainer.service"
import { getErrorMessage } from "@/utils/get-error-message"
import { DAY_LETTERS, DAY_NAMES, formatGymTime, gymDayOfWeek, nextOccurrenceIso, withGymTime } from "@/utils/gym-time"
import type { ClassPayload, ClassSchedulePayload, TrainerClass } from "@/types/trainer"
import { fieldClass, labelClass } from "./styles"

const ROOMS = ["Sala A", "Sala B", "Sala C"]
const SINGLE_ROOM = "Sala única"

interface ClassFormModalProps {
  // Si viene una clase se edita; si no, se crea una nueva.
  clase?: TrainerClass | null
  onClose: () => void
}

export function ClassFormModal({ clase = null, onClose }: ClassFormModalProps) {
  const queryClient = useQueryClient()
  const isEditing = clase !== null
  const originalDay = clase ? gymDayOfWeek(clase.fechaHora) : null

  const initialRoom = clase?.sala ?? ROOMS[0]
  const [name, setName] = useState(clase?.nombre ?? "")
  const [singleRoom, setSingleRoom] = useState(initialRoom === SINGLE_ROOM)
  const [room, setRoom] = useState(initialRoom === SINGLE_ROOM ? ROOMS[0] : initialRoom)
  const [capacity, setCapacity] = useState(clase ? String(clase.cupoMaximo) : "")
  const [day, setDay] = useState(originalDay ?? 1)
  const [startTime, setStartTime] = useState(clase ? formatGymTime(clase.fechaHora) : "")
  const [endTime, setEndTime] = useState(clase?.horaFin ?? "")
  // Días de repetición elegidos. Se guardan en un array de estado que se actualiza
  // siempre con la forma funcional, así cada click suma o quita un día sin pisar a los demás.
  const [repeatDays, setRepeatDays] = useState<number[]>(clase?.recurrente ? clase.diasSemana : [])
  const [errors, setErrors] = useState<string[]>([])

  const dayOptions = [1, 2, 3, 4, 5, 6, ...(day === 7 || repeatDays.includes(7) ? [7] : [])]

  const toggleRepeatDay = (value: number) =>
    setRepeatDays((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value].sort((a, b) => a - b)))

  // La clase ocurre en el día elegido y, si es recurrente, también en los días de repetición.
  const allDays = repeatDays.length > 0 ? [...new Set([day, ...repeatDays])].sort((a, b) => a - b) : [day]
  const endBeforeStart = Boolean(startTime && endTime && endTime <= startTime)

  // Parte del formulario que define dónde y cuándo ocurre la clase (lo que se valida contra otras clases).
  const buildSchedule = (): ClassSchedulePayload | null => {
    if (!startTime || !endTime || endBeforeStart) return null
    // Si no cambió el día de una clase existente se conserva su fecha; si no, es la próxima fecha en que cae ese día.
    const fechaHora = clase && originalDay === day ? withGymTime(clase.fechaHora, startTime) : nextOccurrenceIso(day, startTime)
    return {
      ...(clase ? { claseId: clase.id } : {}),
      sala: singleRoom ? SINGLE_ROOM : room,
      fechaHora,
      horaFin: endTime,
      recurrente: repeatDays.length > 0,
      diasSemana: allDays,
    }
  }

  // Chequeo en vivo de sala/profesor ocupados (con debounce). El backend vuelve a validar al guardar.
  const scheduleKey = (() => {
    const schedule = buildSchedule()
    return schedule ? JSON.stringify(schedule) : null
  })()
  const debouncedKey = useDebounce(scheduleKey, 450)
  const availability = useQuery({
    queryKey: ["trainer", "availability", debouncedKey],
    queryFn: () => trainerService.checkClassAvailability(JSON.parse(debouncedKey as string) as ClassSchedulePayload),
    enabled: debouncedKey !== null,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })
  const checking = scheduleKey !== null && (scheduleKey !== debouncedKey || availability.isFetching)
  const conflict =
    !checking && scheduleKey !== null && scheduleKey === debouncedKey && availability.data && !availability.data.disponible
      ? availability.data.message
      : null

  // Al cambiar sala, horario o días se descartan los errores del intento anterior.
  useEffect(() => {
    setErrors([])
  }, [scheduleKey])

  const save = useMutation({
    mutationFn: (payload: ClassPayload) => (isEditing ? trainerService.updateClass(clase.id, payload) : trainerService.createClass(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer", "classes"] })
      queryClient.invalidateQueries({ queryKey: ["trainer", "profile"] })
      toast.success(isEditing ? "Clase actualizada correctamente" : "Clase creada correctamente")
      onClose()
    },
    // El modal queda abierto con los datos cargados; el mensaje del servidor (p. ej. sala ocupada)
    // se muestra en un aviso fijo, no en un toast que desaparece.
    onError: (error) => {
      setErrors([getErrorMessage(error, "No se pudo guardar la clase")])
      queryClient.invalidateQueries({ queryKey: ["trainer", "availability"] })
    },
  })

  const handleSubmit = () => {
    const problems: string[] = []
    const cupo = Number(capacity)

    if (!name.trim()) problems.push("Ingresá el nombre de la clase.")
    if (!capacity.trim() || !Number.isInteger(cupo) || cupo < 1) problems.push("El cupo máximo debe ser un número entero mayor a 0.")
    if (clase && Number.isInteger(cupo) && cupo < clase.inscriptos) {
      problems.push(`El cupo no puede ser menor a los ${clase.inscriptos} alumnos inscriptos actualmente.`)
    }
    if (!startTime) problems.push("Elegí la hora de inicio.")
    if (!endTime) problems.push("Elegí la hora de fin.")
    if (endBeforeStart) problems.push("La hora de fin debe ser posterior a la de inicio (la clase no puede cruzar la medianoche).")
    if (conflict) problems.push(conflict)

    setErrors(problems)
    const schedule = buildSchedule()
    if (problems.length > 0 || !schedule) return

    save.mutate({ nombre: name.trim(), cupoMaximo: cupo, ...schedule })
  }

  const roomOptions = ROOMS.includes(room) ? ROOMS : [...ROOMS, room]
  const visibleErrors = errors.filter((message) => message !== conflict)

  return (
    <Modal open onClose={onClose} title={isEditing ? "Editar clase" : "Nueva clase"} className="max-w-md">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className={labelClass}>Nombre de la clase</label>
          <input
            type="text"
            value={name}
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej: Spinning, Yoga, HIIT..."
            className={fieldClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className={labelClass}>Sala</label>
            {singleRoom ? (
              <input type="text" value={SINGLE_ROOM} disabled className={`${fieldClass} text-muted-foreground`} />
            ) : (
              <select value={room} onChange={(event) => setRoom(event.target.value)} className={`${fieldClass} ${conflict ? "!border-red-500" : ""}`}>
                {roomOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            )}
          </div>
          <div className="space-y-2">
            <label className={labelClass}>Cupo máximo</label>
            <input
              type="number"
              min={1}
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
              placeholder="20"
              className={fieldClass}
            />
            {clase && <p className="text-xs text-muted-foreground">Inscriptos actuales: {clase.inscriptos}</p>}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary p-3">
          <div>
            <span className="text-sm font-medium text-foreground">Sala única</span>
            <p className="text-xs text-muted-foreground">Activá esta opción si el gimnasio no tiene salas separadas</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={singleRoom}
            aria-label="Alternar sala única"
            onClick={() => setSingleRoom((prev) => !prev)}
            className={`relative h-6 w-12 flex-shrink-0 rounded-full transition-colors ${singleRoom ? "bg-primary" : "bg-border"}`}
          >
            <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${singleRoom ? "right-1" : "left-1"}`} />
          </button>
        </div>

        <div className="space-y-2">
          <label className={labelClass}>Día</label>
          <select
            value={day}
            onChange={(event) => setDay(Number(event.target.value))}
            className={`${fieldClass} ${conflict ? "!border-red-500" : ""}`}
          >
            {dayOptions.map((option) => (
              <option key={option} value={option}>
                {DAY_NAMES[option - 1]}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className={labelClass}>Hora inicio</label>
            <input
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className={`${fieldClass} ${conflict ? "!border-red-500" : ""}`}
            />
          </div>
          <div className="space-y-2">
            <label className={labelClass}>Hora fin</label>
            <input
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              className={`${fieldClass} ${conflict || endBeforeStart ? "!border-red-500" : ""}`}
            />
          </div>
        </div>

        {endBeforeStart && <p className="text-xs text-red-500">La hora de fin debe ser posterior a la de inicio.</p>}

        {checking && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Comprobando disponibilidad de la sala...
          </p>
        )}

        {conflict && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
            <p className="text-sm text-red-500">{conflict} Elegí otra sala u otro horario.</p>
          </div>
        )}

        <div className="space-y-2">
          <label className={labelClass}>Días de repetición</label>
          <div className="flex flex-wrap gap-2">
            {DAY_LETTERS.slice(0, dayOptions.length).map((letter, index) => {
              const value = index + 1
              const selected = repeatDays.includes(value)
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  title={DAY_NAMES[index]}
                  onClick={() => toggleRepeatDay(value)}
                  className={`h-10 w-10 rounded-xl font-medium transition-colors ${
                    selected ? "bg-primary text-primary-foreground ring-2 ring-primary/40" : "bg-secondary text-foreground hover:bg-secondary/70"
                  }`}
                >
                  {letter}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {repeatDays.length === 0
              ? `Sin días marcados: la clase es única (${DAY_NAMES[day - 1]}).`
              : `Se repite todas las semanas: ${allDays.map((value) => DAY_NAMES[value - 1]).join(", ")}.`}
          </p>
        </div>

        {visibleErrors.length > 0 && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
            <ul className="space-y-1 text-sm text-red-500">
              {visibleErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={save.isPending || checking || Boolean(conflict)}
          className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {save.isPending ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear clase"}
        </button>
      </div>
    </Modal>
  )
}
