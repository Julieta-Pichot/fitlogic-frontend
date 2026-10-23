import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Clock, Edit, Flame, ImageIcon, Plus, Trash2, UtensilsCrossed } from "lucide-react"
import toast from "react-hot-toast"
import { Badge, ConfirmDialog } from "@/components/ui"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { assetUrl, trainerService } from "@/services/trainer.service"
import { getErrorMessage } from "@/utils/get-error-message"
import type { TrainerRecipe } from "@/types/trainer"
import { RecipeFormModal } from "./recipe-form-modal"

const titleCase = (value: string) => value.charAt(0) + value.slice(1).toLowerCase()

export function RecipesTab({ onCreate }: { onCreate: () => void }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ["trainer", "recipes"], queryFn: trainerService.listRecipes })

  const [editing, setEditing] = useState<TrainerRecipe | null>(null)
  const [deleting, setDeleting] = useState<TrainerRecipe | null>(null)

  const remove = useMutation({
    mutationFn: (id: number) => trainerService.deleteRecipe(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer", "recipes"] })
      toast.success("Receta eliminada correctamente")
      setDeleting(null)
    },
    onError: (error) => toast.error(getErrorMessage(error, "No se pudo eliminar la receta")),
  })

  const recipes = query.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mis Recetas</h1>
          <p className="mt-1 text-muted-foreground">Recetas saludables para tus alumnos</p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          aria-label="Nueva receta"
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Plus className="h-5 w-5" /> <span className="hidden sm:inline">Nueva receta</span>
        </button>
      </div>

      {query.isLoading ? (
        <LoadingSpinner label="Cargando recetas..." />
      ) : query.isError ? (
        <div className="space-y-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <p className="text-sm text-red-500">{getErrorMessage(query.error, "No se pudieron cargar las recetas")}</p>
          <button type="button" onClick={() => query.refetch()} className="text-sm font-medium text-primary hover:underline">
            Reintentar
          </button>
        </div>
      ) : recipes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <UtensilsCrossed className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground">Todavía no cargaste recetas</h3>
          <p className="max-w-sm text-sm text-muted-foreground">Compartí recetas saludables con tus alumnos: aparecerán acá.</p>
          <button
            type="button"
            onClick={onCreate}
            className="mt-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Nueva receta
          </button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {recipes.map((recipe) => {
            const photo = assetUrl(recipe.foto)
            return (
              <li key={recipe.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30">
                <div className="flex min-w-0 items-center gap-4">
                  {photo ? (
                    <img src={photo} alt={recipe.nombre} className="h-16 w-16 flex-shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <Badge>{titleCase(recipe.categoria.nombre)}</Badge>
                    <h3 className="mt-1 truncate font-semibold text-foreground">{recipe.nombre}</h3>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                      {recipe.calorias !== null && (
                        <span className="flex items-center gap-1">
                          <Flame className="h-3.5 w-3.5" /> {recipe.calorias} kcal
                        </span>
                      )}
                      {recipe.tiempoPreparacion !== null && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {recipe.tiempoPreparacion} min
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(recipe)}
                    aria-label={`Editar ${recipe.nombre}`}
                    className="rounded-lg bg-secondary p-2 text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(recipe)}
                    aria-label={`Eliminar ${recipe.nombre}`}
                    className="rounded-lg bg-red-500/10 p-2 text-red-500 transition-colors hover:bg-red-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {editing && <RecipeFormModal key={editing.id} recipe={editing} onClose={() => setEditing(null)} />}

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar receta"
        description={deleting ? `Vas a eliminar «${deleting.nombre}» junto con sus ingredientes, pasos y foto. Esta acción no se puede deshacer.` : ""}
        confirmLabel="Eliminar"
        destructive
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        onCancel={() => !remove.isPending && setDeleting(null)}
      />
    </div>
  )
}
