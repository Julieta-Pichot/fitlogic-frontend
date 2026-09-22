import { useEffect, useMemo, useState } from "react"
import {
  Home,
  Dumbbell,
  Calendar,
  UtensilsCrossed,
  User,
  Bell,
  Users,
  Plus,
  Search,
  ChevronRight,
  Clock,
  MapPin,
  Edit,
  Trash2,
  FileText,
  X,
  ImageIcon,
  AlertTriangle,
  FileCheck,
  Phone,
  Mail,
  Activity,
} from "lucide-react"
import { NotificationsPanel } from "@/components/shared/notifications-panel"
import { ChangePasswordCard } from "@/components/shared/change-password-card"
import { clientsService, type ClientApiRecord } from "@/services/clients.service"
import { routinesService, type ExerciseRecord } from "@/services/routines.service"
import toast from "react-hot-toast"

interface TrainerDashboardProps {
  userName: string
  userId?: number
  onLogout: () => void
}

type TabType = "home" | "rutinas" | "clases" | "recetas" | "perfil"

type TrainerDataSet = {
  students: Array<{ id: number; name: string; lastRoutine: string; plan: string; isNew: boolean; aptoFisico: string; aptoExpires: string; condicion: string; phone: string }>
  classes: Array<{ id: number; name: string; day: string; time: string; room: string; enrolled: number; max: number }>
  recipes: Array<{ id: number; name: string; category: string; calories: number; image: string }>
  notifications: Array<{ id: number; type: string; title: string; message: string; time: string; read: boolean; icon: typeof Clock; color: string; bgColor: string }>
  routineAssignments: Record<string, { objective: string; progress: number; lastUpdated: string; exercises: number }>
  profile: {
    email: string
    phone: string
    specialty: string
    since: string
  }
}

const trainerProfiles: Record<number, TrainerDataSet> = {
  1: {
    students: [
      { id: 1, name: "María García", lastRoutine: "Hace 2 días", plan: "Musculación", isNew: false, aptoFisico: "Activo", aptoExpires: "15/12/2026", condicion: "Ninguna", phone: "+54 11 1234-5678" },
      { id: 2, name: "Juan Pérez", lastRoutine: "Hace 5 días", plan: "Pérdida de peso", isNew: false, aptoFisico: "Activo", aptoExpires: "20/08/2026", condicion: "Hipertensión controlada", phone: "+54 11 2345-6789" },
      { id: 3, name: "Laura Sánchez", lastRoutine: "Hoy", plan: "Tonificación", isNew: true, aptoFisico: "Pendiente", aptoExpires: "-", condicion: "Lesión de rodilla previa", phone: "+54 11 3456-7890" },
      { id: 4, name: "Carlos Ruiz", lastRoutine: "Ayer", plan: "Fuerza", isNew: false, aptoFisico: "Activo", aptoExpires: "01/06/2026", condicion: "Asma", phone: "+54 11 4567-8901" },
      { id: 5, name: "Sofía Díaz", lastRoutine: "Nuevo", plan: "Acondicionamiento", isNew: true, aptoFisico: "Activo", aptoExpires: "10/11/2026", condicion: "Ninguna", phone: "+54 11 5678-9012" },
    ],
    classes: [
      { id: 1, name: "Spinning Intensivo", day: "Lunes", time: "10:00 - 11:00", room: "Sala B", enrolled: 15, max: 20 },
      { id: 2, name: "Funcional HIIT", day: "Martes", time: "09:00 - 10:00", room: "Sala A", enrolled: 25, max: 25 },
      { id: 3, name: "Spinning Intensivo", day: "Miércoles", time: "10:00 - 11:00", room: "Sala B", enrolled: 18, max: 20 },
      { id: 4, name: "CrossFit", day: "Jueves", time: "08:00 - 09:00", room: "Sala A", enrolled: 12, max: 20 },
      { id: 5, name: "Funcional HIIT", day: "Viernes", time: "09:00 - 10:00", room: "Sala A", enrolled: 20, max: 25 },
    ],
    recipes: [
      { id: 1, name: "Bowl de Avena con Frutas", category: "Desayuno", calories: 320, image: "/recipes/avena.png" },
      { id: 2, name: "Pollo a la Plancha con Verduras", category: "Almuerzo", calories: 450, image: "/recipes/pollo.png" },
      { id: 3, name: "Smoothie de Proteína", category: "Merienda", calories: 220, image: "/recipes/smoothie.png" },
      { id: 4, name: "Salmón al Horno", category: "Cena", calories: 420, image: "/recipes/salmon.png" },
    ],
    notifications: [
      {
        id: 1,
        type: "class",
        title: "Próxima clase por arrancar",
        message: "Spinning Intensivo comienza en 15 minutos en la Sala B.",
        time: "En 15 min",
        read: false,
        icon: Clock,
        color: "text-primary",
        bgColor: "bg-primary/10",
      },
      {
        id: 2,
        type: "class",
        title: "Clase próxima a iniciar",
        message: "Funcional HIIT comienza a las 09:00 en la Sala A.",
        time: "En 45 min",
        read: false,
        icon: Calendar,
        color: "text-green-500",
        bgColor: "bg-green-500/10",
      },
    ],
    routineAssignments: {
      "María García": { objective: "Hipertrofia / fuerza", progress: 82, lastUpdated: "Hace 2 días", exercises: 5 },
      "Juan Pérez": { objective: "Pérdida de peso", progress: 68, lastUpdated: "Hace 5 días", exercises: 4 },
      "Laura Sánchez": { objective: "Tonificación / movilidad", progress: 76, lastUpdated: "Hoy", exercises: 4 },
      "Carlos Ruiz": { objective: "Fuerza general", progress: 71, lastUpdated: "Ayer", exercises: 5 },
      "Sofía Díaz": { objective: "Acondicionamiento", progress: 90, lastUpdated: "Nuevo", exercises: 3 },
    },
    profile: {
      email: "carlos.lopez@fitlogic.com",
      phone: "+54 11 9876-5432",
      specialty: "Musculación y Funcional",
      since: "Marzo 2023",
    },
  },
  2: {
    students: [
      { id: 1, name: "Lucía Gómez", lastRoutine: "Hace 1 día", plan: "Resistencia", isNew: false, aptoFisico: "Activo", aptoExpires: "02/10/2026", condicion: "Ninguna", phone: "+54 11 1111-2222" },
      { id: 2, name: "Diego Román", lastRoutine: "Hace 3 días", plan: "Fuerza", isNew: false, aptoFisico: "Activo", aptoExpires: "18/09/2026", condicion: "Lesión leve en hombro", phone: "+54 11 3333-4444" },
      { id: 3, name: "Paula Torres", lastRoutine: "Hoy", plan: "Cardio", isNew: true, aptoFisico: "Pendiente", aptoExpires: "-", condicion: "Sin observaciones", phone: "+54 11 5555-6666" },
    ],
    classes: [
      { id: 1, name: "Yoga Flow", day: "Lunes", time: "08:00 - 09:00", room: "Sala Yoga", enrolled: 18, max: 20 },
      { id: 2, name: "Pilates Core", day: "Miércoles", time: "09:00 - 10:00", room: "Sala Yoga", enrolled: 14, max: 20 },
      { id: 3, name: "Cardio Circuit", day: "Viernes", time: "18:00 - 19:00", room: "Sala A", enrolled: 16, max: 22 },
    ],
    recipes: [
      { id: 1, name: "Tostadas de Aguacate", category: "Desayuno", calories: 280, image: "/recipes/avena.png" },
      { id: 2, name: "Ensalada de Quinoa", category: "Almuerzo", calories: 390, image: "/recipes/pollo.png" },
      { id: 3, name: "Batido Verde", category: "Merienda", calories: 210, image: "/recipes/smoothie.png" },
    ],
    notifications: [
      {
        id: 1,
        type: "class",
        title: "Clase por comenzar",
        message: "Yoga Flow arranca en 20 minutos.",
        time: "En 20 min",
        read: false,
        icon: Clock,
        color: "text-primary",
        bgColor: "bg-primary/10",
      },
    ],
    routineAssignments: {
      "Lucía Gómez": { objective: "Resistencia aeróbica", progress: 80, lastUpdated: "Hace 1 día", exercises: 4 },
      "Diego Román": { objective: "Fuerza / hipertrofia", progress: 73, lastUpdated: "Hace 3 días", exercises: 5 },
      "Paula Torres": { objective: "Cardio + movilidad", progress: 86, lastUpdated: "Hoy", exercises: 3 },
    },
    profile: {
      email: "ana.martinez@fitlogic.com",
      phone: "+54 11 7777-8888",
      specialty: "Yoga y Cardio",
      since: "Agosto 2022",
    },
  },
  3: {
    students: [
      { id: 1, name: "Nicolás Silva", lastRoutine: "Hace 2 días", plan: "Potencia", isNew: false, aptoFisico: "Activo", aptoExpires: "30/11/2026", condicion: "Ninguna", phone: "+54 11 1212-3434" },
      { id: 2, name: "Valentina Rossi", lastRoutine: "Hoy", plan: "Funcional", isNew: true, aptoFisico: "Activo", aptoExpires: "12/12/2026", condicion: "Sin observaciones", phone: "+54 11 5656-7878" },
    ],
    classes: [
      { id: 1, name: "Cross Training", day: "Martes", time: "07:00 - 08:00", room: "Sala A", enrolled: 19, max: 24 },
      { id: 2, name: "Funcional HIIT", day: "Jueves", time: "18:00 - 19:00", room: "Sala C", enrolled: 22, max: 25 },
    ],
    recipes: [
      { id: 1, name: "Pasta de Garbanzos", category: "Almuerzo", calories: 410, image: "/recipes/pollo.png" },
      { id: 2, name: "Yogur con Granola", category: "Desayuno", calories: 260, image: "/recipes/avena.png" },
    ],
    notifications: [
      {
        id: 1,
        type: "class",
        title: "Próxima sesión",
        message: "Cross Training empieza en 10 minutos.",
        time: "En 10 min",
        read: false,
        icon: Clock,
        color: "text-primary",
        bgColor: "bg-primary/10",
      },
    ],
    routineAssignments: {
      "Nicolás Silva": { objective: "Potencia / fuerza", progress: 77, lastUpdated: "Hace 2 días", exercises: 5 },
      "Valentina Rossi": { objective: "Funcional / movilidad", progress: 84, lastUpdated: "Hoy", exercises: 4 },
    },
    profile: {
      email: "laura.sanchez@fitlogic.com",
      phone: "+54 11 9999-0000",
      specialty: "Cross Training y Funcional",
      since: "Enero 2021",
    },
  },
}

const getTrainerProfile = (userId?: number | string, userName?: string): TrainerDataSet => {
  const key = typeof userId === 'number' ? userId : Number(String(userId ?? userName ?? '1').replace(/\D/g, '')) || 1
  const fallbackIndex = key % Object.keys(trainerProfiles).length || 1
  return trainerProfiles[fallbackIndex] ?? trainerProfiles[1]
}

const getTrainerStorageKey = (userId?: number | string, userName?: string) => {
  const key = typeof userId === 'number' ? userId : String(userId ?? userName ?? 'default')
  return `fitlogic:trainer:${key}`
}

const readTrainerStorage = <T,>(storageKey: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const trainerNotifications = [
  {
    id: 1,
    type: "class",
    title: "Próxima clase por arrancar",
    message: "Spinning Intensivo comienza en 15 minutos en la Sala B.",
    time: "En 15 min",
    read: false,
    icon: Clock,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    id: 2,
    type: "class",
    title: "Clase próxima a iniciar",
    message: "Funcional HIIT comienza a las 09:00 en la Sala A.",
    time: "En 45 min",
    read: false,
    icon: Calendar,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
]

// Catálogo de ejercicios disponibles para armar rutinas
const initialExerciseCatalog = [
  "Press de Banca",
  "Press Inclinado con Mancuernas",
  "Aperturas en Polea",
  "Fondos en Paralelas",
  "Press Francés",
  "Extensiones de Tríceps",
  "Sentadillas",
  "Prensa de Piernas",
  "Extensiones de Cuádriceps",
  "Curl de Piernas",
  "Peso Muerto Rumano",
  "Dominadas",
  "Remo con Barra",
  "Remo en Polea",
  "Curl con Barra",
  "Curl Martillo",
  "Press Militar",
  "Elevaciones Laterales",
  "Plancha Abdominal",
  "Crunch en Polea",
]

// Categorías de rutina y grupos musculares (para categoría Fuerza)
const routineCategories = ["Fuerza", "Cardio", "Flexibilidad", "Funcional", "Movilidad"]
const muscleGroups = ["Pecho", "Espalda", "Piernas", "Hombros", "Brazos", "Abdomen", "Glúteos"]

// Ejercicio seleccionado dentro de una rutina, con series y repeticiones
type RoutineExercise = { name: string; sets: string; reps: string }

export function TrainerDashboard({ userName, userId, onLogout }: TrainerDashboardProps) {
  const profile = useMemo(() => getTrainerProfile(userId, userName), [userId, userName])
  const storageKey = useMemo(() => getTrainerStorageKey(userId, userName), [userId, userName])

  const [activeTab, setActiveTab] = useState<TabType>("home")
  const [showNotifications, setShowNotifications] = useState(false)
  const [showCreateRoutine, setShowCreateRoutine] = useState(false)
  const [showCreateClass, setShowCreateClass] = useState(false)
  const [showCreateRecipe, setShowCreateRecipe] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [homeSearch, setHomeSearch] = useState("")
  const [myStudents, setMyStudents] = useState(() => readTrainerStorage(`${storageKey}:students`, profile.students))
  const [myClasses, setMyClasses] = useState(() => readTrainerStorage(`${storageKey}:classes`, profile.classes))
  const [myRecipes, setMyRecipes] = useState(() => readTrainerStorage(`${storageKey}:recipes`, profile.recipes))
  const [selectedStudent, setSelectedStudent] = useState<(typeof profile.students)[0] | null>(null)
  const [routineStudentName, setRoutineStudentName] = useState(profile.students[0]?.name ?? "")
  const [routineNotes, setRoutineNotes] = useState("")
  const [routineAssignments, setRoutineAssignments] = useState<Record<string, { objective: string; progress: number; lastUpdated: string; exercises: number }>>(() => readTrainerStorage(`${storageKey}:routineAssignments`, profile.routineAssignments))
  const [roomMode, setRoomMode] = useState<"single" | "multiple">("multiple")
  const [classStartTime, setClassStartTime] = useState("")
  const [classDay, setClassDay] = useState("Lunes")
  // Catálogo de ejercicios (mutable: el profe puede sumar ejercicios inexistentes)
  const [exerciseCatalog, setExerciseCatalog] = useState<string[]>(initialExerciseCatalog)
  // Ejercicios seleccionados para la rutina (con series y repeticiones) y buscador del catálogo
  const [selectedExercises, setSelectedExercises] = useState<RoutineExercise[]>([])
  const [exerciseQuery, setExerciseQuery] = useState("")
  // Categoría de la rutina y grupos musculares (solo aplica a Fuerza). Se puede elegir 1 o más en el mismo día.
  const [routineCategory, setRoutineCategory] = useState("Fuerza")
  const [routineMuscles, setRoutineMuscles] = useState<string[]>(["Pecho"])
  const [routineDays, setRoutineDays] = useState<number[]>([1])
  const [exerciseIds, setExerciseIds] = useState<Record<string, number>>({})

  useEffect(() => {
    Promise.all([clientsService.list(), routinesService.listExercises()]).then(([clients, exercises]) => {
      const mappedStudents = clients.map((client: ClientApiRecord) => ({
        id: client.id,
        name: `${client.usuario.nombre} ${client.usuario.apellido}`.trim(),
        lastRoutine: "Sin rutina",
        plan: client.objetivoEntrenamiento ?? "Sin objetivo",
        isNew: false,
        aptoFisico: client.aptoFisicoArchivo ? "Cargado" : "Pendiente",
        aptoExpires: client.aptoFisicoFechaVencimiento ? new Date(client.aptoFisicoFechaVencimiento).toLocaleDateString("es-AR") : "-",
        condicion: client.objetivoEntrenamiento ?? "Sin observaciones",
        phone: client.usuario.telefono ?? "",
      }))
      if (mappedStudents.length) setMyStudents(mappedStudents)
      const ids = Object.fromEntries(exercises.map((exercise: ExerciseRecord) => [exercise.nombre, exercise.id]))
      setExerciseIds(ids)
      setExerciseCatalog(exercises.map((exercise: ExerciseRecord) => exercise.nombre))
    }).catch(() => toast.error("No se pudieron cargar los datos del profesor"))
  }, [])

  useEffect(() => {
    setMyStudents((prev) => {
      const next = readTrainerStorage(`${storageKey}:students`, profile.students)
      return next.length ? next : prev
    })
    setMyClasses((prev) => {
      const next = readTrainerStorage(`${storageKey}:classes`, profile.classes)
      return next.length ? next : prev
    })
    setMyRecipes((prev) => {
      const next = readTrainerStorage(`${storageKey}:recipes`, profile.recipes)
      return next.length ? next : prev
    })
    setRoutineAssignments((prev) => {
      const next = readTrainerStorage(`${storageKey}:routineAssignments`, profile.routineAssignments)
      return Object.keys(next).length ? next : prev
    })
    setRoutineStudentName(profile.students[0]?.name ?? "")
    setSelectedStudent(null)
  }, [profile, storageKey])

  useEffect(() => {
    window.localStorage.setItem(`${storageKey}:students`, JSON.stringify(myStudents))
    window.localStorage.setItem(`${storageKey}:classes`, JSON.stringify(myClasses))
    window.localStorage.setItem(`${storageKey}:recipes`, JSON.stringify(myRecipes))
    window.localStorage.setItem(`${storageKey}:routineAssignments`, JSON.stringify(routineAssignments))
  }, [storageKey, myStudents, myClasses, myRecipes, routineAssignments])

  const toggleMuscle = (muscle: string) => {
    setRoutineMuscles((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle],
    )
  }
  // Alta de ejercicio inexistente
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [newExerciseName, setNewExerciseName] = useState("")
  // Ingredientes y pasos (paso a paso) de la receta
  const [recipeIngredients, setRecipeIngredients] = useState<string[]>([""])
  const [recipeSteps, setRecipeSteps] = useState<string[]>([""])

  const toggleExercise = (name: string) => {
    setSelectedExercises((prev) =>
      prev.some((e) => e.name === name)
        ? prev.filter((e) => e.name !== name)
        : [...prev, { name, sets: "3", reps: "12" }],
    )
  }

  const updateExerciseField = (name: string, field: "sets" | "reps", value: string) => {
    setSelectedExercises((prev) =>
      prev.map((e) => (e.name === name ? { ...e, [field]: value } : e)),
    )
  }

  const addCustomExercise = async () => {
    const name = newExerciseName.trim()
    if (!name) return
    try {
      const exercise = await routinesService.createExercise(name)
      setExerciseIds((prev) => ({ ...prev, [exercise.nombre]: exercise.id }))
      setExerciseCatalog((prev) => (prev.some((e) => e.toLowerCase() === name.toLowerCase()) ? prev : [name, ...prev]))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el ejercicio")
      return
    }
    // Y lo dejamos seleccionado en la rutina actual
    setSelectedExercises((prev) =>
      prev.some((e) => e.name.toLowerCase() === name.toLowerCase())
        ? prev
        : [...prev, { name, sets: "3", reps: "12" }],
    )
    setNewExerciseName("")
    setShowAddExercise(false)
  }

  const filteredCatalog = exerciseCatalog.filter((e) =>
    e.toLowerCase().includes(exerciseQuery.toLowerCase()),
  )

  const updateIngredient = (index: number, value: string) => {
    setRecipeIngredients((prev) => prev.map((s, i) => (i === index ? value : s)))
  }
  const addIngredient = () => setRecipeIngredients((prev) => [...prev, ""])
  const removeIngredient = (index: number) =>
    setRecipeIngredients((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))

  const updateStep = (index: number, value: string) => {
    setRecipeSteps((prev) => prev.map((s, i) => (i === index ? value : s)))
  }
  const addStep = () => setRecipeSteps((prev) => [...prev, ""])
  const removeStep = (index: number) =>
    setRecipeSteps((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))

  // Horarios ya apartados (día + hora inicio) para detectar conflictos
  const occupiedSlots = myClasses.map((c) => `${c.day}-${c.time.split(" ")[0]}`)
  const hasTimeConflict =
    classStartTime !== "" && occupiedSlots.includes(`${classDay}-${classStartTime}`)

  const filteredHomeStudents = homeSearch
    ? myStudents.filter((s) => s.name.toLowerCase().includes(homeSearch.toLowerCase()))
    : []

  const handleCreateRoutine = async () => {
    const student = myStudents.find((item) => item.name.toLowerCase() === routineStudentName.trim().toLowerCase())

    if (!student || selectedExercises.length === 0) {
      return
    }

    const exercises = selectedExercises.map((exercise) => ({
      ejercicioId: exerciseIds[exercise.name],
      series: Number(exercise.sets),
      repeticiones: Number(exercise.reps),
    })).filter((exercise) => exercise.ejercicioId)
    if (!exercises.length || !routineDays.length) {
      toast.error("Seleccioná días y ejercicios válidos")
      return
    }

    try {
      await routinesService.create({
        clienteId: student.id,
        nombre: routineCategory,
        descripcion: routineNotes,
        objetivo: routineCategory,
        diasSemana: routineDays,
        ejercicios,
      })
      setRoutineAssignments((prev) => ({ ...prev, [student.name]: { objective: routineCategory, progress: 0, lastUpdated: "Hoy", exercises: exercises.length } }))
      toast.success("Rutina guardada correctamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear la rutina")
      return
    }

    const nextStudent = { ...student, lastRoutine: "Hoy" }
    setSelectedStudent(nextStudent)
    setShowCreateRoutine(false)
    setRoutineNotes("")
    setSelectedExercises([])
    setRoutineStudentName(student.name)
    setActiveTab("rutinas")
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-lg font-bold text-foreground">FitLogic</span>
              <span className="text-xs text-primary ml-2 font-medium">Profesor</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <Bell className="w-5 h-5 text-foreground" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-medium">
                2
              </span>
            </button>
            <button
              onClick={() => setActiveTab("perfil")}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-semibold"
            >
              {userName.charAt(0)}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4">
        {activeTab === "home" && (
          <div className="space-y-6">
            {/* Welcome */}
            <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-5 text-primary-foreground">
              <p className="text-primary-foreground/80 text-sm">Bienvenido, Profesor</p>
              <h1 className="text-2xl font-bold mt-1">{userName}</h1>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span className="font-semibold">{myClasses.length} clases a cargo</span>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={homeSearch}
                onChange={(e) => setHomeSearch(e.target.value)}
                placeholder="Buscar cliente para asignarle una rutina..."
                className="w-full pl-11 pr-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder:text-muted-foreground"
              />
              {homeSearch && (
                <div className="absolute z-20 left-0 right-0 mt-2 bg-card border border-border rounded-xl overflow-hidden shadow-lg">
                  {filteredHomeStudents.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground text-center">Sin resultados</p>
                  ) : (
                    filteredHomeStudents.map((student) => (
                      <button
                        key={student.id}
                        onClick={() => {
                          setSelectedStudent(student)
                          setHomeSearch("")
                        }}
                        className="w-full p-3 flex items-center gap-3 hover:bg-secondary/50 transition-colors text-left"
                      >
                        <div className="w-9 h-9 bg-secondary rounded-lg flex items-center justify-center text-foreground font-medium">
                          {student.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground text-sm">{student.name}</p>
                          <p className="text-xs text-muted-foreground">{student.plan}</p>
                        </div>
                        {student.isNew && (
                          <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">Nuevo</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setShowCreateRoutine(true)}
                className="bg-card border border-border rounded-2xl p-4 text-center hover:border-primary/50 transition-all"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">Nueva Rutina</p>
              </button>
              <button
                onClick={() => setShowCreateClass(true)}
                className="bg-card border border-border rounded-2xl p-4 text-center hover:border-primary/50 transition-all"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">Nueva Clase</p>
              </button>
              <button
                onClick={() => setShowCreateRecipe(true)}
                className="bg-card border border-border rounded-2xl p-4 text-center hover:border-primary/50 transition-all"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <UtensilsCrossed className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">Nueva Receta</p>
              </button>
            </div>

            {/* Today's Classes */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="font-semibold text-foreground">Clases de Hoy</h2>
                <button
                  onClick={() => setActiveTab("clases")}
                  className="text-primary text-sm font-medium flex items-center gap-1"
                >
                  Ver todas <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="divide-y divide-border">
                {myClasses.slice(0, 2).map((classItem) => (
                  <div key={classItem.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{classItem.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {classItem.time}
                        </span>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {classItem.room}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-foreground">
                        {classItem.enrolled}/{classItem.max}
                      </span>
                      <p className="text-xs text-muted-foreground">inscriptos</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {activeTab === "rutinas" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Rutinas</h1>
                <p className="text-muted-foreground mt-1">Buscá un cliente y asignale o editá su rutina</p>
              </div>
              <button
                onClick={() => setShowCreateRoutine(true)}
                className="p-3 bg-primary text-primary-foreground rounded-xl"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar alumno por nombre o ID..."
                className="w-full pl-11 pr-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Students List */}
            <div className="space-y-3">
              {myStudents
                .filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((student) => {
                  const routine = routineAssignments[student.name] ?? {
                    objective: student.plan,
                    progress: 55,
                    lastUpdated: student.lastRoutine,
                    exercises: 3,
                  }

                  return (
                    <div
                      key={student.id}
                      className="bg-card border border-border rounded-2xl p-4"
                    >
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setSelectedStudent(student)}
                          className="flex items-center gap-3 text-left"
                        >
                          <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center text-foreground font-semibold">
                            {student.name.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-foreground">{student.name}</p>
                              {student.isNew && (
                                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">Nuevo</span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{student.plan}</p>
                          </div>
                        </button>
                        <div className="flex items-center gap-2">
                          <button className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSelectedStudent(student)}
                            className="p-2 bg-secondary text-muted-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Objetivo</span>
                          <span className="font-medium text-foreground">{routine.objective}</span>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>Seguimiento</span>
                            <span>{routine.progress}%</span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${routine.progress}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Última actualización</span>
                          <span className="font-medium text-foreground">{routine.lastUpdated}</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Última actualización: {student.lastRoutine}
                        </span>
                        <button
                          onClick={() => setSelectedStudent(student)}
                          className="text-sm text-primary font-medium"
                        >
                          Ver ficha
                        </button>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {activeTab === "clases" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Mis Clases</h1>
                <p className="text-muted-foreground mt-1">Administra tus clases semanales</p>
              </div>
              <button
                onClick={() => setShowCreateClass(true)}
                className="p-3 bg-primary text-primary-foreground rounded-xl"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Classes List */}
            <div className="space-y-3">
              {myClasses.map((classItem) => (
                <div
                  key={classItem.id}
                  className="bg-card border border-border rounded-2xl p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{classItem.name}</h3>
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                          {classItem.day}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="w-4 h-4" /> {classItem.time}
                        </span>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-4 h-4" /> {classItem.room}
                        </span>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Users className="w-4 h-4" /> {classItem.enrolled}/{classItem.max}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 bg-secondary text-muted-foreground rounded-lg hover:bg-secondary/80 transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(classItem.enrolled / classItem.max) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "recetas" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Mis Recetas</h1>
                <p className="text-muted-foreground mt-1">Recetas saludables para tus alumnos</p>
              </div>
              <button
                onClick={() => setShowCreateRecipe(true)}
                className="p-3 bg-primary text-primary-foreground rounded-xl"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Recipes List */}
            <div className="space-y-3">
              {myRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <img
                      src={recipe.image || "/placeholder.svg"}
                      alt={recipe.name}
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-primary uppercase tracking-wide">
                        {recipe.category}
                      </span>
                      <h3 className="font-semibold text-foreground mt-1 truncate">{recipe.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{recipe.calories} kcal</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button className="p-2 bg-secondary text-muted-foreground rounded-lg hover:bg-secondary/80 transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "perfil" && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-2xl font-bold">
                  {userName.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">{userName}</h1>
                  <p className="text-muted-foreground">Profesor</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                      {myClasses.length} clases a cargo
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trainer Data */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Datos del Profesor</h2>
              </div>
              <div className="divide-y divide-border">
                <div className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-foreground">carlos.lopez@fitlogic.com</p>
                  </div>
                </div>
                <div className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Teléfono</p>
                    <p className="text-foreground">+54 11 9876-5432</p>
                  </div>
                </div>
                <div className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
                    <Dumbbell className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Especialidad</p>
                    <p className="text-foreground">Musculación y Funcional</p>
                  </div>
                </div>
                <div className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">En el gimnasio desde</p>
                    <p className="text-foreground">Marzo 2023</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cambio de contraseña temporal */}
            <ChangePasswordCard />

            <button
              onClick={onLogout}
              className="w-full p-4 bg-red-500/10 text-red-500 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border z-50">
        <div className="flex items-center justify-around py-2 px-2">
          {[
            { id: "home", icon: Home, label: "Inicio" },
            { id: "rutinas", icon: Dumbbell, label: "Rutinas" },
            { id: "clases", icon: Calendar, label: "Clases" },
            { id: "recetas", icon: UtensilsCrossed, label: "Recetas" },
            { id: "perfil", icon: User, label: "Perfil" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Modals */}
      <NotificationsPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={trainerNotifications}
      />

      {/* Create Routine Modal */}
      {showCreateRoutine && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Nueva Rutina</h2>
              <button
                onClick={() => setShowCreateRoutine(false)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Buscar Alumno</label>
                <input
                  type="text"
                  value={routineStudentName}
                  onChange={(e) => setRoutineStudentName(e.target.value)}
                  placeholder="Nombre o ID del alumno"
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Días de la Semana</label>
                <div className="flex flex-wrap gap-2">
                  {["L", "M", "X", "J", "V", "S", "D"].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const dayIndex = ["L", "M", "X", "J", "V", "S", "D"].indexOf(day) + 1
                        setRoutineDays((prev) => prev.includes(dayIndex) ? prev.filter((item) => item !== dayIndex) : [...prev, dayIndex])
                      }}
                      className={`w-10 h-10 rounded-xl transition-colors font-medium ${routineDays.includes(["L", "M", "X", "J", "V", "S", "D"].indexOf(day) + 1) ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground"}`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              {/* Categoría de la rutina */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Categoría</label>
                <select
                  value={routineCategory}
                  onChange={(e) => setRoutineCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                >
                  {routineCategories.map((cat) => (
                    <option key={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Grupos musculares (solo para Fuerza) - se pueden elegir 1 o más en el mismo día */}
              {routineCategory === "Fuerza" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Grupos Musculares</label>
                  <p className="text-xs text-muted-foreground">Podés seleccionar uno o más para el mismo día</p>
                  <div className="flex flex-wrap gap-2">
                    {muscleGroups.map((m) => {
                      const isSelected = routineMuscles.includes(m)
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => toggleMuscle(m)}
                          className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-foreground hover:bg-secondary/80"
                          }`}
                        >
                          {m}
                        </button>
                      )
                    })}
                  </div>
                  {routineMuscles.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {routineMuscles.length} grupo(s) seleccionado(s): {routineMuscles.join(", ")}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Ejercicios</label>

                {/* Ejercicios ya agregados con series y repeticiones */}
                {selectedExercises.length > 0 && (
                  <div className="space-y-2">
                    {selectedExercises.map((ex) => (
                      <div
                        key={ex.name}
                        className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-foreground">{ex.name}</span>
                          <button
                            type="button"
                            onClick={() => toggleExercise(ex.name)}
                            aria-label={`Quitar ${ex.name}`}
                            className="text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Series</label>
                            <input
                              type="number"
                              min={1}
                              value={ex.sets}
                              onChange={(e) => updateExerciseField(ex.name, "sets", e.target.value)}
                              className="w-full px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Repeticiones</label>
                            <input
                              type="number"
                              min={1}
                              value={ex.reps}
                              onChange={(e) => updateExerciseField(ex.name, "reps", e.target.value)}
                              className="w-full px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Buscador del catálogo de ejercicios */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={exerciseQuery}
                    onChange={(e) => setExerciseQuery(e.target.value)}
                    placeholder="Buscar ejercicio en la lista..."
                    className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground text-sm"
                  />
                </div>

                {/* Lista de ejercicios para elegir */}
                <div className="max-h-44 overflow-y-auto bg-secondary rounded-xl border border-border divide-y divide-border">
                  {filteredCatalog.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground text-center">Sin resultados</p>
                  ) : (
                    filteredCatalog.map((ex) => {
                      const isSelected = selectedExercises.some((e) => e.name === ex)
                      return (
                        <button
                          key={ex}
                          type="button"
                          onClick={() => toggleExercise(ex)}
                          className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-card/50 transition-colors"
                        >
                          <span className="text-sm text-foreground">{ex}</span>
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isSelected ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
                            }`}
                          >
                            {isSelected ? <FileCheck className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>

                {/* Agregar ejercicio inexistente */}
                {showAddExercise ? (
                  <div className="bg-secondary rounded-xl border border-primary/30 p-3 space-y-2">
                    <label className="text-xs font-medium text-foreground">Nuevo ejercicio</label>
                    <input
                      type="text"
                      value={newExerciseName}
                      onChange={(e) => setNewExerciseName(e.target.value)}
                      placeholder="Ej: Hip Thrust con Barra"
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={addCustomExercise}
                        disabled={!newExerciseName.trim()}
                        className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Crear y agregar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddExercise(false)
                          setNewExerciseName("")
                        }}
                        className="px-3 py-2 bg-card text-foreground rounded-lg text-sm font-medium hover:bg-card/70 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddExercise(true)}
                    className="w-full py-2.5 border border-dashed border-primary/40 text-primary rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary/5 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" /> Agregar ejercicio inexistente
                  </button>
                )}

                <p className="text-xs text-muted-foreground">
                  {selectedExercises.length} ejercicio(s) agregado(s) a la rutina
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Notas de la rutina</label>
                <textarea
                  value={routineNotes}
                  onChange={(e) => setRoutineNotes(e.target.value)}
                  rows={3}
                  placeholder="Objetivo, progresos, restricciones y observaciones..."
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <button
                onClick={handleCreateRoutine}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
              >
                Crear Rutina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Class Modal */}
      {showCreateClass && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Nueva Clase</h2>
              <button
                onClick={() => setShowCreateClass(false)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nombre de la Clase</label>
                <input
                  type="text"
                  placeholder="Ej: Spinning, Yoga, HIIT..."
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Sala</label>
                  {roomMode === "single" ? (
                    <input
                      type="text"
                      value="Sala única"
                      disabled
                      className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-muted-foreground"
                    />
                  ) : (
                    <select className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground">
                      <option>Sala A</option>
                      <option>Sala B</option>
                      <option>Sala C</option>
                    </select>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Cupo Máximo</label>
                  <input
                    type="number"
                    placeholder="20"
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              {/* Room mode: single vs multiple */}
              <label className="flex items-center justify-between p-3 bg-secondary rounded-xl cursor-pointer">
                <div>
                  <span className="text-sm font-medium text-foreground">Sala única</span>
                  <p className="text-xs text-muted-foreground">Activá esta opción si el gimnasio no tiene salas separadas</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRoomMode(roomMode === "single" ? "multiple" : "single")}
                  className={`w-12 h-6 rounded-full relative transition-colors flex-shrink-0 ${roomMode === "single" ? "bg-primary" : "bg-border"}`}
                  aria-label="Alternar sala única"
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${roomMode === "single" ? "right-1" : "left-1"}`} />
                </button>
              </label>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Día</label>
                <select
                  value={classDay}
                  onChange={(e) => setClassDay(e.target.value)}
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                >
                  {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Hora Inicio</label>
                  <input
                    type="time"
                    value={classStartTime}
                    onChange={(e) => setClassStartTime(e.target.value)}
                    className={`w-full px-4 py-3 bg-secondary border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground ${hasTimeConflict ? "border-red-500" : "border-border"}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Hora Fin</label>
                  <input
                    type="time"
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  />
                </div>
              </div>

              {hasTimeConflict && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-500">
                    Ese horario ya está apartado el {classDay}. No está disponible, elegí otro horario.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Días de Repetición</label>
                <div className="flex flex-wrap gap-2">
                  {["L", "M", "X", "J", "V", "S"].map((day) => (
                    <button
                      key={day}
                      type="button"
                      className="w-10 h-10 rounded-xl bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground transition-colors font-medium"
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              <button
                disabled={hasTimeConflict}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Crear Clase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Recipe Modal */}
      {showCreateRecipe && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Nueva Receta</h2>
              <button
                onClick={() => setShowCreateRecipe(false)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Foto / Miniatura</label>
                <button
                  type="button"
                  className="w-full aspect-video bg-secondary border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                >
                  <ImageIcon className="w-8 h-8" />
                  <p className="text-sm">Subir foto de la receta</p>
                  <p className="text-xs">Se mostrará como miniatura en la app</p>
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nombre</label>
                <input
                  type="text"
                  placeholder="Nombre de la receta"
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Categoría</label>
                <select className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground">
                  <option>Desayuno</option>
                  <option>Almuerzo</option>
                  <option>Merienda</option>
                  <option>Merienda Tarde</option>
                  <option>Cena</option>
                </select>
              </div>
              {/* Información nutricional */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Información Nutricional</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Calorías (kcal)</label>
                    <input
                      type="number"
                      placeholder="350"
                      className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Proteínas (g)</label>
                    <input
                      type="number"
                      placeholder="25"
                      className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Grasas (g)</label>
                    <input
                      type="number"
                      placeholder="10"
                      className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Carbohidratos (g)</label>
                    <input
                      type="number"
                      placeholder="40"
                      className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Otro dato nutricional (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej: Fibra 6g, Azúcares 12g, Sodio 200mg..."
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Descripción</label>
                <textarea
                  rows={3}
                  placeholder="Describe la receta..."
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground resize-none"
                />
              </div>

              {/* Ingredientes */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Ingredientes</label>
                <div className="space-y-2">
                  {recipeIngredients.map((ingredient, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="w-10 h-10 flex items-center justify-center bg-primary/10 text-primary rounded-xl flex-shrink-0">
                        <UtensilsCrossed className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={ingredient}
                        onChange={(e) => updateIngredient(index, e.target.value)}
                        placeholder={`Ej: 100g de avena`}
                        className="flex-1 px-4 py-2.5 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeIngredient(index)}
                        disabled={recipeIngredients.length === 1}
                        aria-label={`Eliminar ingrediente ${index + 1}`}
                        className="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addIngredient}
                  className="w-full py-2.5 bg-secondary text-foreground rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" /> Agregar ingrediente
                </button>
              </div>

              {/* Paso a paso de la preparación */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Paso a Paso</label>
                <div className="space-y-2">
                  {recipeSteps.map((step, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="w-8 h-10 flex items-center justify-center bg-primary/10 text-primary rounded-xl font-semibold flex-shrink-0 text-sm">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={step}
                        onChange={(e) => updateStep(index, e.target.value)}
                        placeholder={`Describe el paso ${index + 1}...`}
                        className="flex-1 px-4 py-2.5 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        disabled={recipeSteps.length === 1}
                        aria-label={`Eliminar paso ${index + 1}`}
                        className="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addStep}
                  className="w-full py-2.5 bg-secondary text-foreground rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" /> Agregar paso
                </button>
              </div>
              <button className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors">
                Crear Receta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Ficha del Alumno</h2>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-secondary rounded-xl flex items-center justify-center text-foreground text-xl font-semibold">
                  {selectedStudent.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground text-lg">{selectedStudent.name}</h3>
                    {selectedStudent.isNew && (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">Nuevo</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedStudent.plan}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">{selectedStudent.phone}</span>
              </div>

              {/* Apto Físico */}
              <div className="p-4 border border-border rounded-xl flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedStudent.aptoFisico === "Activo" ? "bg-green-500/10" : "bg-yellow-500/10"}`}>
                  <FileCheck className={`w-5 h-5 ${selectedStudent.aptoFisico === "Activo" ? "text-green-500" : "text-yellow-500"}`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Apto Físico</p>
                  {selectedStudent.aptoFisico === "Activo" ? (
                    <p className="text-sm text-green-500">Activo · Vence {selectedStudent.aptoExpires}</p>
                  ) : (
                    <p className="text-sm text-yellow-500">Pendiente de entrega</p>
                  )}
                </div>
              </div>

              {/* Condición médica */}
              <div className={`p-4 border rounded-xl flex items-start gap-3 ${selectedStudent.condicion === "Ninguna" ? "border-border" : "border-yellow-500/30 bg-yellow-500/5"}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedStudent.condicion === "Ninguna" ? "bg-secondary" : "bg-yellow-500/10"}`}>
                  <Activity className={`w-5 h-5 ${selectedStudent.condicion === "Ninguna" ? "text-muted-foreground" : "text-yellow-500"}`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Condición / Observaciones</p>
                  <p className={`text-sm ${selectedStudent.condicion === "Ninguna" ? "text-muted-foreground" : "text-foreground"}`}>
                    {selectedStudent.condicion}
                  </p>
                </div>
              </div>

              <button className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors">
                Ver / Editar Rutina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
