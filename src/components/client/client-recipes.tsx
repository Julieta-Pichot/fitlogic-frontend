import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Clock, Flame, ImageIcon, Search, SlidersHorizontal, UtensilsCrossed, X } from "lucide-react"
import { Badge, Modal } from "@/components/ui"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useDebounce } from "@/hooks/use-debounce"
import { clientService } from "@/services/client.service"
import { assetUrl } from "@/services/trainer.service"
import { getErrorMessage } from "@/utils/get-error-message"
import { formatIngredient } from "@/utils/ingredient"
import type { ClientRecipe, ClientRecipeDetail, MacroDistribution, Nutrition, RecipeFilters, RecipeOrder } from "@/types/client"
import { EmptyBlock, QueryState } from "./client-ui"

const titleCase = (value: string) => value.charAt(0) + value.slice(1).toLowerCase()

// 12,5 -> "12,5"; 40 -> "40". null = dato no informado (nunca se muestra como 0).
const grams = (value: number | null) => (value === null ? null : `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(value)} g`)

const EMPTY_FILTERS: RecipeFilters = { categoria: "todas", q: "", caloriasMax: "", proteinasMin: "", orden: "recientes" }
const ORDERS: Array<{ value: RecipeOrder; label: string }> = [
  { value: "recientes", label: "Más recientes" },
  { value: "nombre", label: "Nombre (A-Z)" },
  { value: "calorias_asc", label: "Menos calorías" },
  { value: "proteinas_desc", label: "Más proteínas" },
]

const inputClass =
  "w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"

export function ClientRecipes() {
  const [filters, setFilters] = useState<RecipeFilters>(EMPTY_FILTERS)
  const [viewing, setViewing] = useState<number | null>(null)
  // El texto y los números se envían al backend con una pequeña demora para no consultar en cada tecla.
  const debounced = useDebounce(filters, 350)

  const categories = useQuery({ queryKey: ["client", "recipe-categories"], queryFn: clientService.listRecipeCategories, staleTime: 300_000 })
  const recipes = useQuery({ queryKey: ["client", "recipes", debounced], queryFn: () => clientService.listRecipes(debounced), placeholderData: (previous) => previous })

  const set = <K extends keyof RecipeFilters>(key: K, value: RecipeFilters[K]) => setFilters((current) => ({ ...current, [key]: value }))
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Recetas saludables</h1>
        <p className="mt-1 text-muted-foreground">Ideas de tus profesores para comer bien</p>
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2" role="tablist" aria-label="Categorías">
          {[{ id: 0, nombre: "todas" }, ...(categories.data ?? [])].map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filters.categoria === item.nombre}
              onClick={() => set("categoria", item.nombre)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                filters.categoria === item.nombre ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/70"
              }`}
            >
              {item.nombre === "todas" ? "Todas" : titleCase(item.nombre)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={filters.q}
            maxLength={100}
            onChange={(event) => set("q", event.target.value)}
            placeholder="Buscar receta por nombre"
            aria-label="Buscar receta por nombre"
            className={`${inputClass} pl-9`}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Calorías máx. (kcal)</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={10000}
              step={1}
              value={filters.caloriasMax}
              onChange={(event) => set("caloriasMax", event.target.value)}
              placeholder="Sin límite"
              className={inputClass}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Proteínas mín. (g)</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={999.9}
              step={0.1}
              value={filters.proteinasMin}
              onChange={(event) => set("proteinasMin", event.target.value)}
              placeholder="Sin mínimo"
              className={inputClass}
            />
          </label>
          <label className="col-span-2 space-y-1 sm:col-span-1">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <SlidersHorizontal className="h-3 w-3" /> Ordenar por
            </span>
            <select value={filters.orden} onChange={(event) => set("orden", event.target.value as RecipeOrder)} className={inputClass}>
              {ORDERS.map((order) => (
                <option key={order.value} value={order.value}>
                  {order.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {hasFilters && (
          <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            <X className="h-4 w-4" /> Limpiar filtros
          </button>
        )}
      </div>

      <QueryState query={recipes} label="Cargando recetas..." fallback="No se pudieron cargar las recetas">
        {recipes.data?.length === 0 ? (
          <EmptyBlock
            icon={<UtensilsCrossed className="h-7 w-7" />}
            title={hasFilters ? "No encontramos recetas con esos filtros" : "Todavía no hay recetas"}
            description={hasFilters ? "Probá con otros valores o quitá algún filtro." : "Tus profesores van a ir sumando recetas."}
            action={
              hasFilters ? (
                <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="rounded-xl bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/70">
                  Limpiar filtros
                </button>
              ) : undefined
            }
          />
        ) : (
          <ul className={`grid gap-3 sm:grid-cols-2 ${recipes.isPlaceholderData ? "opacity-60" : ""}`}>
            {recipes.data?.map((recipe) => (
              <li key={recipe.id}>
                <RecipeCard recipe={recipe} onView={() => setViewing(recipe.id)} />
              </li>
            ))}
          </ul>
        )}
      </QueryState>

      {viewing !== null && <RecipeModal id={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}

function RecipePhoto({ foto, name, className }: { foto: string | null; name: string; className: string }) {
  const url = assetUrl(foto)
  return url ? (
    <img src={url} alt={name} className={`${className} object-cover`} loading="lazy" />
  ) : (
    <div className={`${className} flex items-center justify-center bg-secondary text-muted-foreground`}>
      <ImageIcon className="h-8 w-8" />
    </div>
  )
}

function RecipeCard({ recipe, onView }: { recipe: ClientRecipe; onView: () => void }) {
  const macros = [
    recipe.proteinasG !== null && `P ${grams(recipe.proteinasG)}`,
    recipe.carbohidratosG !== null && `C ${grams(recipe.carbohidratosG)}`,
    recipe.grasasG !== null && `G ${grams(recipe.grasasG)}`,
  ].filter(Boolean)

  return (
    <button
      type="button"
      onClick={onView}
      className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <RecipePhoto foto={recipe.foto} name={recipe.nombre} className="h-20 w-20 flex-shrink-0 rounded-xl" />
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
        {macros.length > 0 && <p className="mt-0.5 truncate text-xs text-muted-foreground">{macros.join(" · ")} por porción</p>}
      </div>
    </button>
  )
}

const MACRO_STYLE = {
  proteinas: { label: "Proteínas", bar: "bg-red-500", dot: "bg-red-500" },
  carbohidratos: { label: "Carbohidratos", bar: "bg-amber-500", dot: "bg-amber-500" },
  grasas: { label: "Grasas", bar: "bg-sky-500", dot: "bg-sky-500" },
} as const

function NutritionTile({ label, value, unit }: { label: string; value: string | number | null; unit?: string }) {
  return (
    <div className="rounded-xl bg-secondary p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      {value === null ? (
        <p className="mt-1 text-sm font-medium text-muted-foreground">No informado</p>
      ) : (
        <p className="mt-1 text-lg font-bold text-foreground">
          {value}
          {unit && <span className="ml-0.5 text-xs font-medium text-muted-foreground">{unit}</span>}
        </p>
      )}
    </div>
  )
}

// Porcentaje de las calorías aportadas por cada macro (4/4/9 kcal por gramo). Sin los tres macros no hay gráfico.
function MacroBar({ distribution }: { distribution: MacroDistribution }) {
  const items = (Object.keys(MACRO_STYLE) as Array<keyof typeof MACRO_STYLE>).map((key) => ({ key, value: distribution[key] }))
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Distribución de calorías</p>
      <div
        className="flex h-3 overflow-hidden rounded-full bg-secondary"
        role="img"
        aria-label={items.map((item) => `${MACRO_STYLE[item.key].label} ${item.value}%`).join(", ")}
      >
        {items.map((item) => (
          <div key={item.key} className={MACRO_STYLE[item.key].bar} style={{ width: `${item.value}%` }} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${MACRO_STYLE[item.key].dot}`} />
            {MACRO_STYLE[item.key].label} {new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(item.value)}%
          </li>
        ))}
      </ul>
    </div>
  )
}

function NutritionSection({ recipe }: { recipe: Nutrition & { distribucionMacros: MacroDistribution | null } }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold text-foreground">Información nutricional</h3>
        <p className="text-xs text-muted-foreground">
          Valores por porción{recipe.porciones !== null ? ` · rinde ${recipe.porciones} ${recipe.porciones === 1 ? "porción" : "porciones"}` : ""}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <NutritionTile label="Calorías" value={recipe.calorias} unit="kcal" />
        <NutritionTile label="Proteínas" value={grams(recipe.proteinasG)} />
        <NutritionTile label="Carbohidratos" value={grams(recipe.carbohidratosG)} />
        <NutritionTile label="Grasas" value={grams(recipe.grasasG)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NutritionTile label="Porciones" value={recipe.porciones} />
        <NutritionTile label="Otro dato" value={recipe.otroDatoNutricional} />
      </div>
      {recipe.distribucionMacros && <MacroBar distribution={recipe.distribucionMacros} />}
    </div>
  )
}

function RecipeModal({ id, onClose }: { id: number; onClose: () => void }) {
  const query = useQuery({ queryKey: ["client", "recipe", id], queryFn: () => clientService.getRecipe(id) })
  const recipe: ClientRecipeDetail | undefined = query.data

  return (
    <Modal open onClose={onClose} title={recipe?.nombre ?? "Receta"} description={recipe ? `Receta de ${recipe.profesor}` : undefined} className="max-w-xl">
      {query.isLoading ? (
        <LoadingSpinner label="Cargando receta..." />
      ) : query.isError || !recipe ? (
        <div role="alert" className="space-y-3 py-6 text-center">
          <p className="text-sm text-red-500">{getErrorMessage(query.error, "No se pudo cargar la receta")}</p>
          <button type="button" onClick={() => query.refetch()} className="text-sm font-medium text-primary hover:underline">
            Reintentar
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <RecipePhoto foto={recipe.foto} name={recipe.nombre} className="aspect-video w-full rounded-xl" />
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{titleCase(recipe.categoria.nombre)}</Badge>
            {recipe.tiempoPreparacion !== null && <Badge variant="secondary">{recipe.tiempoPreparacion} min</Badge>}
          </div>
          {recipe.descripcion && <p className="whitespace-pre-line text-sm text-muted-foreground">{recipe.descripcion}</p>}

          <NutritionSection recipe={recipe} />

          {recipe.ingredientes.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Ingredientes</h3>
              <ul className="space-y-1.5">
                {recipe.ingredientes.map((item) => (
                  <li key={item.id} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" /> {formatIngredient(item)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recipe.pasos.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Paso a paso</h3>
              <ol className="space-y-2">
                {recipe.pasos.map((step) => (
                  <li key={step.numeroPaso} className="flex gap-3">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">{step.numeroPaso}</span>
                    <p className="pt-0.5 text-sm text-foreground">{step.descripcion}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
