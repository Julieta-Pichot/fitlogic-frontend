import { useState } from "react"
import { Clock, Flame, Search, X, ChefHat } from "lucide-react"

const categories = [
  { id: "all", label: "Todas" },
  { id: "desayuno", label: "Desayuno" },
  { id: "almuerzo", label: "Almuerzo" },
  { id: "merienda", label: "Merienda" },
  { id: "cena", label: "Cena" },
]

const recipes = [
  {
    id: 1,
    name: "Bowl de Avena con Frutas",
    category: "desayuno",
    time: "10 min",
    calories: 320,
    author: "Prof. Carlos López",
    protein: 12,
    carbs: 52,
    fats: 8,
    description: "Avena cocida con leche de almendras, banana, frutos rojos y semillas de chía. Ideal para empezar el día con energía.",
    image: "🥣",
    ingredients: ["1/2 taza de avena", "1 taza de leche de almendras", "1 banana", "Frutos rojos", "1 cda de semillas de chía"],
    steps: [
      "Calentá la leche de almendras en una olla a fuego medio.",
      "Agregá la avena y cociná 5 minutos revolviendo.",
      "Serví en un bowl y agregá la banana en rodajas.",
      "Terminá con los frutos rojos y las semillas de chía por encima.",
    ],
  },
  {
    id: 2,
    name: "Tostadas de Aguacate",
    category: "desayuno",
    time: "5 min",
    calories: 280,
    author: "Prof. Carlos López",
    protein: 10,
    carbs: 28,
    fats: 14,
    description: "Pan integral tostado con aguacate machacado, huevo pochado y semillas de sésamo.",
    image: "🥑",
    ingredients: ["2 rebanadas de pan integral", "1 aguacate", "1 huevo", "Semillas de sésamo", "Sal y pimienta"],
    steps: [
      "Tostá el pan integral hasta que esté crocante.",
      "Machacá el aguacate con sal y pimienta.",
      "Pochá el huevo en agua hirviendo 3 minutos.",
      "Untá el aguacate, colocá el huevo y espolvoreá sésamo.",
    ],
  },
  {
    id: 3,
    name: "Pollo a la Plancha con Verduras",
    category: "almuerzo",
    time: "25 min",
    calories: 450,
    author: "Prof. Carlos López",
    protein: 42,
    carbs: 38,
    fats: 10,
    description: "Pechuga de pollo a la plancha acompañada de brócoli, zanahorias y arroz integral.",
    image: "🍗",
    ingredients: ["1 pechuga de pollo", "1 taza de brócoli", "1 zanahoria", "1/2 taza de arroz integral", "Aceite de oliva"],
    steps: [
      "Cociná el arroz integral según las instrucciones del paquete.",
      "Sazoná la pechuga y cocinala a la plancha 6 minutos por lado.",
      "Herví o salteá el brócoli y la zanahoria.",
      "Serví todo junto con un hilo de aceite de oliva.",
    ],
  },
  {
    id: 4,
    name: "Ensalada César Proteica",
    category: "almuerzo",
    time: "15 min",
    calories: 380,
    author: "Prof. Carlos López",
    protein: 35,
    carbs: 22,
    fats: 16,
    description: "Lechuga romana, pollo grillado, parmesano rallado, crutones integrales y aderezo ligero.",
    image: "🥗",
    ingredients: ["Lechuga romana", "1 pechuga de pollo grillada", "Parmesano rallado", "Crutones integrales", "Aderezo césar ligero"],
    steps: [
      "Cortá la lechuga romana y colocala en un bowl.",
      "Agregá el pollo grillado en tiras.",
      "Sumá los crutones integrales y el parmesano.",
      "Aliñá con el aderezo césar ligero y mezclá.",
    ],
  },
  {
    id: 5,
    name: "Wrap de Atún",
    category: "almuerzo",
    time: "10 min",
    calories: 350,
    author: "Prof. Carlos López",
    protein: 28,
    carbs: 30,
    fats: 12,
    description: "Tortilla integral rellena de atún, aguacate, tomate y lechuga.",
    image: "🌯",
    ingredients: ["1 tortilla integral", "1 lata de atún", "1/2 aguacate", "1 tomate", "Lechuga"],
    steps: [
      "Escurrí el atún y mezclalo con el aguacate pisado.",
      "Calentá levemente la tortilla integral.",
      "Colocá la lechuga, el tomate en rodajas y la mezcla de atún.",
      "Enrollá firmemente y cortá por la mitad.",
    ],
  },
  {
    id: 6,
    name: "Smoothie de Proteína",
    category: "merienda",
    time: "5 min",
    calories: 220,
    author: "Prof. Carlos López",
    protein: 25,
    carbs: 24,
    fats: 6,
    description: "Batido de proteína de vainilla con banana, mantequilla de maní y leche de almendras.",
    image: "🥤",
    ingredients: ["1 scoop de proteína de vainilla", "1 banana", "1 cda de mantequilla de maní", "1 taza de leche de almendras", "Hielo"],
    steps: [
      "Colocá todos los ingredientes en la licuadora.",
      "Agregá hielo a gusto.",
      "Licuá hasta obtener una textura cremosa.",
      "Serví inmediatamente.",
    ],
  },
  {
    id: 7,
    name: "Yogur con Granola",
    category: "merienda",
    time: "3 min",
    calories: 250,
    author: "Prof. Carlos López",
    protein: 18,
    carbs: 30,
    fats: 8,
    description: "Yogur griego natural con granola casera, miel y frutos secos.",
    image: "🥛",
    ingredients: ["1 taza de yogur griego", "1/4 taza de granola", "1 cda de miel", "Frutos secos"],
    steps: [
      "Serví el yogur griego en un bowl.",
      "Agregá la granola por encima.",
      "Sumá los frutos secos picados.",
      "Terminá con un hilo de miel.",
    ],
  },
  {
    id: 8,
    name: "Salmón al Horno",
    category: "cena",
    time: "30 min",
    calories: 420,
    author: "Prof. Carlos López",
    protein: 38,
    carbs: 26,
    fats: 18,
    description: "Filete de salmón al horno con limón, espárragos y batata asada.",
    image: "🐟",
    ingredients: ["1 filete de salmón", "1 limón", "Espárragos", "1 batata", "Aceite de oliva"],
    steps: [
      "Precalentá el horno a 200°C.",
      "Colocá el salmón en una fuente con rodajas de limón.",
      "Sumá la batata en cubos y los espárragos con aceite de oliva.",
      "Horneá 20-25 minutos hasta que el salmón esté cocido.",
    ],
  },
  {
    id: 9,
    name: "Tortilla de Claras",
    category: "cena",
    time: "10 min",
    calories: 180,
    author: "Prof. Carlos López",
    protein: 22,
    carbs: 6,
    fats: 6,
    description: "Tortilla de claras de huevo con espinacas, champiñones y queso bajo en grasa.",
    image: "🍳",
    ingredients: ["4 claras de huevo", "1 puñado de espinacas", "Champiñones", "Queso bajo en grasa", "Sal"],
    steps: [
      "Salteá las espinacas y los champiñones en una sartén.",
      "Batí las claras con una pizca de sal.",
      "Volcá las claras sobre las verduras a fuego medio.",
      "Agregá el queso, doblá la tortilla y serví.",
    ],
  },
]

export function ClientRecipes() {
  const [activeCategory, setActiveCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRecipe, setSelectedRecipe] = useState<typeof recipes[0] | null>(null)

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesCategory = activeCategory === "all" || recipe.category === activeCategory
    const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Recetas Saludables</h1>
        <p className="text-muted-foreground mt-1">Ideas nutritivas para tu dieta</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar recetas..."
          className="w-full pl-11 pr-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder:text-muted-foreground transition-all"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeCategory === category.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Recipes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredRecipes.map((recipe) => (
          <div
            key={recipe.id}
            onClick={() => setSelectedRecipe(recipe)}
            className="bg-card border border-border rounded-2xl overflow-hidden cursor-pointer hover:border-primary/50 transition-all"
          >
            <div className="h-32 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-5xl">
              {recipe.image}
            </div>
            <div className="p-4">
              <span className="text-xs font-medium text-primary uppercase tracking-wide">
                {recipe.category}
              </span>
              <h3 className="font-semibold text-foreground mt-1">{recipe.name}</h3>
              <div className="flex items-center gap-4 mt-3">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="w-4 h-4" /> {recipe.time}
                </span>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Flame className="w-4 h-4" /> {recipe.calories} kcal
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredRecipes.length === 0 && (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <p className="text-foreground font-medium">No se encontraron recetas</p>
          <p className="text-sm text-muted-foreground mt-1">
            Probá con otra búsqueda o categoría
          </p>
        </div>
      )}

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="h-40 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-7xl relative">
              {selectedRecipe.image}
              <button
                onClick={() => setSelectedRecipe(null)}
                className="absolute top-4 right-4 p-2 bg-card/80 backdrop-blur-sm rounded-full hover:bg-card transition-colors"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <span className="text-xs font-medium text-primary uppercase tracking-wide">
                  {selectedRecipe.category}
                </span>
                <h2 className="text-xl font-bold text-foreground mt-1">{selectedRecipe.name}</h2>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                  <ChefHat className="w-4 h-4" /> Receta de {selectedRecipe.author}
                </p>
              </div>

              <div className="flex gap-4">
                <div className="flex-1 bg-secondary rounded-xl p-3 text-center">
                  <Clock className="w-5 h-5 text-muted-foreground mx-auto" />
                  <p className="font-medium text-foreground mt-1">{selectedRecipe.time}</p>
                  <p className="text-xs text-muted-foreground">Preparación</p>
                </div>
                <div className="flex-1 bg-secondary rounded-xl p-3 text-center">
                  <Flame className="w-5 h-5 text-muted-foreground mx-auto" />
                  <p className="font-medium text-foreground mt-1">{selectedRecipe.calories}</p>
                  <p className="text-xs text-muted-foreground">Calorías</p>
                </div>
              </div>

              {/* Información nutricional */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-secondary rounded-xl p-3 text-center">
                  <p className="font-semibold text-foreground">{selectedRecipe.protein}g</p>
                  <p className="text-xs text-muted-foreground">Proteínas</p>
                </div>
                <div className="bg-secondary rounded-xl p-3 text-center">
                  <p className="font-semibold text-foreground">{selectedRecipe.carbs}g</p>
                  <p className="text-xs text-muted-foreground">Carbohidratos</p>
                </div>
                <div className="bg-secondary rounded-xl p-3 text-center">
                  <p className="font-semibold text-foreground">{selectedRecipe.fats}g</p>
                  <p className="text-xs text-muted-foreground">Grasas</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Descripción</h3>
                <p className="text-muted-foreground leading-relaxed">{selectedRecipe.description}</p>
              </div>

              {/* Ingredientes */}
              <div>
                <h3 className="font-semibold text-foreground mb-2">Ingredientes</h3>
                <ul className="space-y-1.5">
                  {selectedRecipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-center gap-2 text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      {ingredient}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Paso a paso */}
              <div>
                <h3 className="font-semibold text-foreground mb-2">Paso a Paso</h3>
                <ol className="space-y-3">
                  {selectedRecipe.steps.map((step, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm flex-shrink-0">
                        {index + 1}
                      </span>
                      <p className="text-muted-foreground leading-relaxed pt-0.5">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
