// El modal de recetas carga cada ingrediente como una sola línea de texto ("100g de avena"),
// pero la BD lo guarda separado (nombre, cantidad, unidad). Estas funciones convierten entre ambos.

const UNITS =
  'kg|gramos?|gr|g|mg|ml|cc|litros?|lt|l|tazas?|cucharadas?|cucharaditas?|cdas?|cdtas?|unidades?|u|porciones?|rodajas?|dientes?|pizcas?|fetas?|rebanadas?';

const INGREDIENT_PATTERN = new RegExp(`^(\\d+(?:[.,]\\d+)?|\\d+/\\d+)\\s*(${UNITS})?\\b\\s*(?:de\\s+)?(.+)$`, 'i');

export interface ParsedIngredient {
  nombre: string;
  cantidad: string | null;
  unidad: string | null;
}

export const parseIngredient = (text: string): ParsedIngredient | null => {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return null;

  const match = clean.match(INGREDIENT_PATTERN);
  if (!match) return { nombre: clean, cantidad: null, unidad: null };

  const [, cantidad, unidad, nombre] = match;
  return { nombre: nombre.trim(), cantidad, unidad: unidad ?? null };
};

export const formatIngredient = (item: { nombre: string; cantidad: string | null; unidad: string | null }) => {
  if (item.cantidad && item.unidad) return `${item.cantidad} ${item.unidad} de ${item.nombre}`;
  if (item.cantidad) return `${item.cantidad} ${item.nombre}`;
  return item.nombre;
};
