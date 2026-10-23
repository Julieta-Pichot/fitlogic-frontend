import { useEffect, useRef, useState, type DragEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, ImageIcon, Plus, RefreshCw, Trash2, UtensilsCrossed, X } from "lucide-react"
import toast from "react-hot-toast"
import { Modal } from "@/components/ui"
import { assetUrl, trainerService } from "@/services/trainer.service"
import { getErrorMessage } from "@/utils/get-error-message"
import { formatIngredient, parseIngredient } from "@/utils/ingredient"
import type { RecipePayload, TrainerRecipe } from "@/types/trainer"
import { fieldClass, labelClass } from "./styles"

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_PHOTO_BYTES = 5 * 1024 * 1024

const titleCase = (value: string) => value.charAt(0) + value.slice(1).toLowerCase()

const smallInput =
  "flex-1 px-4 py-2.5 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground text-sm"
const removeButton =
  "w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"

interface RecipeFormModalProps {
  // Si viene una receta se edita; si no, se crea una nueva.
  recipe?: TrainerRecipe | null
  onClose: () => void
}

export function RecipeFormModal({ recipe = null, onClose }: RecipeFormModalProps) {
  const queryClient = useQueryClient()
  const isEditing = recipe !== null
  const fileInput = useRef<HTMLInputElement>(null)

  const categories = useQuery({ queryKey: ["trainer", "recipe-categories"], queryFn: trainerService.listRecipeCategories, staleTime: 300_000 })

  const [name, setName] = useState(recipe?.nombre ?? "")
  const [categoryId, setCategoryId] = useState(recipe ? String(recipe.categoria.id) : "")
  const [calories, setCalories] = useState(recipe?.calorias?.toString() ?? "")
  const [prepTime, setPrepTime] = useState(recipe?.tiempoPreparacion?.toString() ?? "")
  // Proteínas, grasas, carbohidratos y otros datos: hoy la BD no tiene columnas para guardarlos (solo calorías).
  const [protein, setProtein] = useState("")
  const [fat, setFat] = useState("")
  const [carbs, setCarbs] = useState("")
  const [otherNutrition, setOtherNutrition] = useState("")
  const [description, setDescription] = useState(recipe?.descripcion ?? "")
  const [ingredients, setIngredients] = useState<string[]>(recipe?.ingredientes.length ? recipe.ingredientes.map(formatIngredient) : [""])
  const [steps, setSteps] = useState<string[]>(recipe?.pasos.length ? recipe.pasos.map((step) => step.descripcion) : [""])

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  // Si se editó sin tocar la categoría, se precarga con la actual; si no, con la primera disponible.
  useEffect(() => {
    if (!categoryId && categories.data?.length) setCategoryId(String(categories.data[0].id))
  }, [categories.data, categoryId])

  // Libera la URL temporal de la vista previa al cambiar de imagen o cerrar el modal.
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  const currentPhoto = photoPreview ?? (removeExistingPhoto ? null : assetUrl(recipe?.foto))

  const selectPhoto = (file: File | undefined) => {
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Formato no permitido. Usá JPG, PNG o WEBP.")
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("La imagen supera el máximo de 5 MB.")
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setRemoveExistingPhoto(false)
  }

  const clearPhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
    setRemoveExistingPhoto(Boolean(recipe?.foto))
    if (fileInput.current) fileInput.current.value = ""
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    selectPhoto(event.dataTransfer.files?.[0])
  }

  const updateAt = (setter: typeof setIngredients, index: number, value: string) =>
    setter((prev) => prev.map((item, i) => (i === index ? value : item)))
  const removeAt = (setter: typeof setIngredients, index: number) =>
    setter((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))

  const save = useMutation({
    mutationFn: (payload: RecipePayload) =>
      isEditing ? trainerService.updateRecipe(recipe.id, payload, photoFile) : trainerService.createRecipe(payload, photoFile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer", "recipes"] })
      toast.success(isEditing ? "Receta actualizada correctamente" : "Receta creada correctamente")
      onClose()
    },
    onError: (error) => setErrors([getErrorMessage(error, "No se pudo guardar la receta")]),
  })

  const handleSubmit = () => {
    const problems: string[] = []
    const kcal = calories.trim() === "" ? null : Number(calories)
    const minutes = prepTime.trim() === "" ? null : Number(prepTime)

    if (!name.trim()) problems.push("Ingresá el nombre de la receta.")
    if (!categoryId) problems.push("Elegí una categoría.")
    if (kcal !== null && (!Number.isInteger(kcal) || kcal < 0)) problems.push("Las calorías deben ser un número entero (0 o más).")
    if (minutes !== null && (!Number.isInteger(minutes) || minutes < 0)) problems.push("El tiempo de preparación debe ser un número entero de minutos.")

    setErrors(problems)
    if (problems.length > 0) return

    save.mutate({
      nombre: name.trim(),
      categoriaRecetaId: Number(categoryId),
      descripcion: description.trim(),
      calorias: kcal,
      tiempoPreparacion: minutes,
      ingredientes: ingredients.map(parseIngredient).filter((item): item is NonNullable<typeof item> => item !== null),
      pasos: steps.map((step) => step.trim()).filter(Boolean).map((descripcion) => ({ descripcion })),
      quitarFoto: removeExistingPhoto,
    })
  }

  return (
    <Modal open onClose={onClose} title={isEditing ? "Editar receta" : "Nueva receta"} className="max-w-md">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className={labelClass}>Foto / Miniatura</label>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => {
              selectPhoto(event.target.files?.[0])
              event.target.value = ""
            }}
          />
          <div
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            {currentPhoto ? (
              <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-secondary">
                <img src={currentPhoto} alt="Vista previa de la receta" className="h-full w-full object-cover" />
                <div className="absolute bottom-2 right-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className="flex items-center gap-1.5 rounded-lg bg-black/65 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-black/80"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="flex items-center gap-1.5 rounded-lg bg-black/65 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-red-600"
                  >
                    <X className="h-3.5 w-3.5" /> Quitar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className={`flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-secondary text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground ${
                  dragging ? "border-primary text-foreground" : "border-border"
                }`}
              >
                <ImageIcon className="h-8 w-8" />
                <p className="text-sm">Subir foto de la receta</p>
                <p className="text-xs">JPG, PNG o WEBP · hasta 5 MB · también podés arrastrarla acá</p>
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className={labelClass}>Nombre</label>
          <input
            type="text"
            value={name}
            maxLength={150}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nombre de la receta"
            className={fieldClass}
          />
        </div>

        <div className="space-y-2">
          <label className={labelClass}>Categoría</label>
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            disabled={categories.isLoading}
            className={fieldClass}
          >
            {categories.isLoading && <option value="">Cargando...</option>}
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {titleCase(category.nombre)}
              </option>
            ))}
          </select>
          {categories.isError && <p className="text-xs text-red-500">No se pudieron cargar las categorías.</p>}
        </div>

        <div className="space-y-2">
          <label className={labelClass}>Información nutricional</label>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["Calorías (kcal)", calories, setCalories, "350"],
                ["Proteínas (g)", protein, setProtein, "25"],
                ["Grasas (g)", fat, setFat, "10"],
                ["Carbohidratos (g)", carbs, setCarbs, "40"],
              ] as const
            ).map(([label, value, setter, placeholder]) => (
              <div key={label} className="space-y-1">
                <label className="text-xs text-muted-foreground">{label}</label>
                <input
                  type="number"
                  min={0}
                  value={value}
                  onChange={(event) => setter(event.target.value)}
                  placeholder={placeholder}
                  className={fieldClass}
                />
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Otro dato nutricional (opcional)</label>
            <input
              type="text"
              value={otherNutrition}
              onChange={(event) => setOtherNutrition(event.target.value)}
              placeholder="Ej: Fibra 6g, Azúcares 12g, Sodio 200mg..."
              className={fieldClass}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Tiempo de preparación (min)</label>
            <input
              type="number"
              min={0}
              value={prepTime}
              onChange={(event) => setPrepTime(event.target.value)}
              placeholder="20"
              className={fieldClass}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className={labelClass}>Descripción</label>
          <textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe la receta..."
            className={`${fieldClass} resize-none`}
          />
        </div>

        <div className="space-y-2">
          <label className={labelClass}>Ingredientes</label>
          <div className="space-y-2">
            {ingredients.map((ingredient, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <UtensilsCrossed className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={ingredient}
                  onChange={(event) => updateAt(setIngredients, index, event.target.value)}
                  placeholder="Ej: 100g de avena"
                  className={smallInput}
                />
                <button
                  type="button"
                  onClick={() => removeAt(setIngredients, index)}
                  disabled={ingredients.length === 1}
                  aria-label={`Eliminar ingrediente ${index + 1}`}
                  className={removeButton}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIngredients((prev) => [...prev, ""])}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
          >
            <Plus className="h-4 w-4" /> Agregar ingrediente
          </button>
        </div>

        <div className="space-y-2">
          <label className={labelClass}>Paso a paso</label>
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="flex h-10 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={step}
                  onChange={(event) => updateAt(setSteps, index, event.target.value)}
                  placeholder={`Describe el paso ${index + 1}...`}
                  className={smallInput}
                />
                <button
                  type="button"
                  onClick={() => removeAt(setSteps, index)}
                  disabled={steps.length === 1}
                  aria-label={`Eliminar paso ${index + 1}`}
                  className={removeButton}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSteps((prev) => [...prev, ""])}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
          >
            <Plus className="h-4 w-4" /> Agregar paso
          </button>
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

        <button
          type="button"
          onClick={handleSubmit}
          disabled={save.isPending}
          className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {save.isPending ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear receta"}
        </button>
      </div>
    </Modal>
  )
}
