/*
  El vocabulario del dominio. Es el contrato que consumen el motor, el catálogo,
  la persistencia y las pantallas: si un nombre cambia acá, cambia en todos lados.
*/

export type Modo = 'arrancarYa' | 'ambientePorAmbiente' | 'puestaAPunto'

export type Verbo = 'ordenar' | 'limpiar' | 'guardar' | 'tirar' | 'lavar'

export type EstadoPaso = 'pendiente' | 'hecho' | 'salteado'

export type EstadoAmbiente = 'pendiente' | 'aMedioCamino' | 'alDia'

export type TipoAmbiente =
  | 'cocina'
  | 'bano'
  | 'dormitorio'
  | 'living'
  | 'lavadero'
  | 'balcon'
  | 'escritorio'
  | 'garage'

export const VERBOS: readonly Verbo[] = ['ordenar', 'limpiar', 'guardar', 'tirar', 'lavar']

export const TIPOS_AMBIENTE: readonly TipoAmbiente[] = [
  'cocina',
  'bano',
  'dormitorio',
  'living',
  'lavadero',
  'balcon',
  'escritorio',
  'garage',
]

/** Todos los ambientes del catálogo comparten este hogar. */
export const HOGAR_CATALOGO = 'catalogo'

export interface Ambiente {
  id: string
  hogarId: string
  tipo: TipoAmbiente
  nombre: string
  /** Posición en el recorrido lógico de la casa. Único dentro del catálogo. */
  ordenRecorrido: number
  ultimaPuestaAlDia: string | null
  /** Contador histórico. Solo sube. */
  vecesAlDia: number
}

export interface SubAmbiente {
  id: string
  ambienteId: string
  nombre: string
}

/** El objeto físico sobre el que se trabaja: la mesada, las hornallas, el piso. */
export interface Objeto {
  id: string
  ambienteId: string
  subAmbienteId: string | null
  nombre: string
}

export interface Tarea {
  id: string
  ambienteId: string
  subAmbienteId: string | null
  objetoId: string | null
  verbo: Verbo
  /** El imperativo que la pantalla del plan muestra en grande, en voseo: «Trapeá». */
  accion: string
  /** El complemento, sin el verbo: «el piso». La pantalla lo muestra debajo de la acción. */
  descripcion: string
  duracionMin: number
  esfuerzo: 1 | 2 | 3
  /** Cuánto se nota el resultado al entrar al ambiente. */
  impactoVisual: 1 | 2 | 3
  /** Ids de otras tareas que deben estar hechas antes que esta. */
  requiere: string[]
  herramientas: string[]
  /** Distingue lo propuesto por la app de lo agregado por la persona. */
  esDelCatalogo: boolean
  notas: string | null
}

export interface Paso {
  tareaId: string
  estado: EstadoPaso
  hechoEn: string | null
  /**
   * Cuándo se empezó a trabajar en este paso. Nulo hasta que el paso anterior se
   * cierra: es lo que permite medir cuánto tardó cada tarea.
   */
  empezadoEn?: string | null
  /** Lo que tardó de verdad, medido al cerrarlo. Nulo mientras está pendiente. */
  segundosReales?: number | null
}

export interface Plan {
  id: string
  creadoEn: string
  modo: Modo
  /** Segundos. Se calcula como `presupuestoMin * 60` al crear el plan. null = sin límite. */
  presupuestoSegundos: number | null
  pasos: Paso[]
  cerradoEn: string | null
  /** Minutos de lo que quedó afuera por falta de tiempo. */
  minutosFaltantes: number
  advertencias: string[]
}

export interface MetaSesion {
  pasos: number
  minutos: number
}

export interface ResultadoPlan {
  plan: Plan
  meta: MetaSesion
}

export interface EntradaPlan {
  /** Los ambientes que la persona incluyó. Hacen falta para `ordenRecorrido` y `ultimaPuestaAlDia`. */
  ambientes: Ambiente[]
  /** Solo las tareas incluidas por la persona. */
  tareas: Tarea[]
  /** Ids ya completados en el ciclo actual: no vuelven a aparecer en el plan. */
  hechasEnCiclo: string[]
  /** En minutos, para poder comparar con `Tarea.duracionMin`. null = sin límite. */
  presupuestoMin: number | null
  modo: Modo
  herramientasDisponibles: string[]
}

/**
 * Cómo se mide el tiempo durante el trabajo.
 *
 * `cuentaAtras` baja desde el presupuesto hasta cero. `carrera` sube desde cero y
 * muestra la ventaja o la desventaja contra lo que estaba estimado: terminás antes
 * y ganás segundos, terminás después y los perdés. Ninguna de las dos cuesta nada:
 * el tiempo es información, no una deuda.
 */
export type EstiloDeReloj = 'cuentaAtras' | 'carrera'

export interface Preferencias {
  herramientasDisponibles: string[]
  modoPorDefecto: Modo
  /** Minutos de los retos contrarreloj. */
  duracionRetoPreferida: number
  /** Cuál de los dos relojes se usa al trabajar. */
  estiloDeReloj: EstiloDeReloj
  /**
   * La playlist de la persona, si pegó una. Nulo significa que la app ofrece sus
   * propias búsquedas. Es una dirección, no un identificador: sirve igual para
   * Spotify que para YouTube, y no ata la app a ninguna plataforma.
   */
  playlistPropia: string | null
  /**
   * La clave de IA de la persona. Vive solo en este teléfono y viaja únicamente al
   * proveedor elegido, en el pedido que ella dispara. Nunca se registra en ningún
   * lado, ni siquiera en un mensaje de error.
   */
  claveDeIa: string | null
  /**
   * Si la persona leyó y aceptó la advertencia de privacidad. Sin esto, la app no
   * hace ni un pedido: la IA se activa solo después de un sí explícito.
   */
  avisoDePrivacidadAceptado: boolean
  /**
   * Qué versión del aviso de IA aceptó. Cuando el aviso cambia en algo que importa,
   * se sube `VERSION_AVISO_IA` y quien aceptó una versión anterior tiene que leer y
   * aceptar la nueva antes de seguir usando la IA: aceptar un texto no es aceptar
   * otro. Cero significa que nunca aceptó ninguna con versión.
   */
  versionAvisoIa: number
}

/** Las herramientas que la app asume si la persona no dijo nada. */
export const HERRAMIENTAS_POR_DEFECTO: readonly string[] = [
  'escoba',
  'trapo',
  'balde',
  'detergente',
]

/*
  El registro de todo lo que la persona terminó, alguna vez.

  Es una tabla que solo crece: se escribe una fila por tarea completada y no se
  borra nunca, ni siquiera cuando se reinicia el ciclo de un ambiente. Es lo que
  permite que los totales no bajen jamás.
*/
export interface MarcaDeHistorial {
  tareaId: string
  ambienteId: string
  minutos: number
  hechoEn: string
}

/** Una tarea marcada como hecha dentro del ciclo actual de un ambiente. */
export interface MarcaDeCiclo {
  tareaId: string
  ambienteId: string
  hechoEn: string
}
