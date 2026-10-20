import { VERBOS } from './tipos'
import type { Preferencias, Verbo } from './tipos'

/*
  La IA propone, la persona decide.

  Dos reglas mandan acá, y las dos son de la especificación.

  La primera: la clave nunca sale del teléfono, salvo hacia el proveedor que la
  persona eligió y en el pedido que ella misma disparó. No pasa por ningún servidor
  nuestro —no tenemos— y no queda en ningún registro.

  La segunda: NADA de lo que devuelve el modelo se escribe solo. La IA tira ideas, la
  persona tilda las que le sirven, y recién ahí se convierten en tareas. Un modelo
  que escribe en la lista de alguien sin permiso es lo contrario de esta app.

  Este archivo es puro: arma el pedido y lee la respuesta. La llamada de red vive en
  la frontera impura, como el reloj.
*/

export interface Sugerencia {
  accion: string
  descripcion: string
  duracionMin: number
  verbo: Verbo
}

/** Más que esto no es una ayuda: es una lista nueva que hay que leer entera. */
const MAXIMO_DE_SUGERENCIAS = 8

/** Lo que la IA puede pedirle a la persona que haga, en el vocabulario del catálogo. */
const VERBOS_VALIDOS = new Set<string>(VERBOS)

export interface EntradaDeIa {
  /** El ambiente que se está armando, con el nombre que la persona reconoce. */
  ambiente: string
  /** Las tareas que ya están en la lista, para que no las repita. */
  yaIncluidas: string[]
  /** Lo que la persona escribió, si escribió algo. */
  descripcion: string | null
  /** Si viene una foto, el pedido lo dice, para que el modelo la mire de verdad. */
  hayFoto: boolean
}

export function armarPedido(entrada: EntradaDeIa): string {
  const yaEstan =
    entrada.yaIncluidas.length > 0
      ? `Ya están en la lista, no las repitas: ${entrada.yaIncluidas.join('; ')}.`
      : 'La lista está vacía.'

  const mirar = entrada.hayFoto
    ? 'Mirá la foto y decime qué hay que hacer ahí, en concreto.'
    : 'Baste con lo que te escribo.'

  return [
    `Estás ayudando a ordenar y limpiar ${entrada.ambiente} de una casa.`,
    mirar,
    yaEstan,
    entrada.descripcion ? `La persona cuenta esto: «${entrada.descripcion}».` : '',
    'Devolvé entre 3 y 6 tareas concretas, de la más urgente a la menos.',
    'Cada tarea es UNA acción chica que se pueda empezar sin pensar, no una categoría.',
    'En "accion" va el verbo en imperativo y voseo, con la primera letra en mayúscula y sin punto final.',
    'En "descripcion" va el objeto, en minúscula. Por ejemplo: accion "Limpiá", descripcion "la mesada".',
    'En "duracionMin" van minutos enteros, entre 2 y 40, realistas para una sola persona.',
    `En "verbo" va uno de estos, sin inventar otros: ${[...VERBOS_VALIDOS].join(', ')}.`,
    'Contestá SOLO con un arreglo JSON, sin texto alrededor y sin bloques de código.',
    'Cada elemento tiene exactamente estas cuatro claves: accion, descripcion, duracionMin, verbo.',
  ]
    .filter((linea) => linea !== '')
    .join('\n')
}

/**
 * Lee la respuesta del modelo.
 *
 * Los modelos contestan con bloques de código o con una frase de cortesía más de la
 * mitad de las veces, así que el texto se limpia antes de parsear. Y cada sugerencia
 * se valida una por una: lo que no encaja se descarta en silencio, porque una idea
 * rara no puede romper la pantalla ni colarse en la lista de nadie.
 */
export function leerSugerencias(texto: string): Sugerencia[] {
  const limpio = texto
    .replace(/^\s*```(?:json)?/i, '')
    .replace(/```\s*$/, '')
    .trim()

  const desde = limpio.indexOf('[')
  const hasta = limpio.lastIndexOf(']')
  if (desde === -1 || hasta === -1 || hasta < desde) return []

  let crudo: unknown
  try {
    crudo = JSON.parse(limpio.slice(desde, hasta + 1))
  } catch {
    return []
  }

  if (!Array.isArray(crudo)) return []

  const sugerencias: Sugerencia[] = []
  for (const item of crudo) {
    if (typeof item !== 'object' || item === null) continue
    const posible = item as Record<string, unknown>

    const accion = typeof posible.accion === 'string' ? posible.accion.trim() : ''
    if (accion === '' || accion.length > 120) continue

    const descripcion = typeof posible.descripcion === 'string' ? posible.descripcion.trim() : ''
    const duracion = Number(posible.duracionMin)
    if (!Number.isFinite(duracion)) continue

    const verbo = typeof posible.verbo === 'string' && VERBOS_VALIDOS.has(posible.verbo) ? (posible.verbo as Verbo) : 'ordenar'

    sugerencias.push({
      accion,
      descripcion,
      // Se acota en vez de descartar: un «90 minutos» es una idea usable, solo que
      // más larga de lo que entra en una sesión.
      duracionMin: Math.min(120, Math.max(2, Math.round(duracion))),
      verbo,
    })

    if (sugerencias.length >= MAXIMO_DE_SUGERENCIAS) break
  }

  return sugerencias
}

/**
 * La versión vigente del aviso de IA. La 1 hablaba solo de la clave; la 2 es el texto
 * de la sección 9.3 de la especificación —que personas de Google pueden leer las
 * fotos— más la declaración de mayoría de edad. Se sube cada vez que el aviso cambia
 * en algo que la persona tiene que volver a aceptar.
 */
export const VERSION_AVISO_IA = 2

/** Si la persona aceptó el aviso VIGENTE. Aceptar uno anterior no alcanza. */
export function avisoIaAceptado(preferencias: Pick<Preferencias, 'avisoDePrivacidadAceptado' | 'versionAvisoIa'>): boolean {
  return preferencias.avisoDePrivacidadAceptado && preferencias.versionAvisoIa >= VERSION_AVISO_IA
}
