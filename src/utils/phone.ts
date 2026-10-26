// Misma regla que el backend: números, espacios y + - ( ) . con al menos 6 dígitos (máx. 50 caracteres).
export const PHONE_MESSAGE = 'El teléfono solo puede tener números, espacios y los símbolos + - ( ) y debe tener al menos 6 dígitos'

export const isValidPhone = (value: string) => {
  const text = value.trim()
  return text.length <= 50 && /^[0-9+()\-.\s]+$/.test(text) && (text.match(/\d/g) ?? []).length >= 6
}
