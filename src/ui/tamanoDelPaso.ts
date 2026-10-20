/*
  De qué tamaño va la consigna en la tarjeta del paso.

  Un solo tamaño enorme no alcanzaba: a 360 px entraban unos 30 caracteres en las
  tres líneas permitidas, y la mitad larga del catálogo —«Llevá las tazas y los vasos
  a la cocina»— se cortaba justo en el objeto, que es lo que dice qué hacer. Recortar
  una instrucción la vuelve otra.

  La regla ahora es la inversa: la consigna entra entera, y lo que se ajusta es el
  tamaño. Las cortas —la mitad del catálogo tiene menos de 18 caracteres— conservan
  la letra enorme del plan visual; las largas bajan de escalón hasta entrar.
*/

export type TamanoDelPaso = 'grande' | 'mediano' | 'chico' | 'minimo'

/** Hasta cuántos caracteres entra cada escalón, a 360 px, sin recortar. */
const ESCALONES: [TamanoDelPaso, number][] = [
  ['grande', 18],
  ['mediano', 32],
  ['chico', 60],
]

export function tamanoDelPaso(consigna: string): TamanoDelPaso {
  const largo = consigna.trim().length
  for (const [tamano, hasta] of ESCALONES) {
    if (largo <= hasta) return tamano
  }
  return 'minimo'
}
