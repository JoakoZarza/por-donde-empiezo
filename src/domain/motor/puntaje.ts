import type { Modo, Tarea, Verbo } from '../tipos'

/*
  El puntaje decide el orden cuando dos tareas están disponibles al mismo tiempo.
  Es la única parte del motor que cambia entre modos: el resto del algoritmo es
  igual, y el modo solo mueve estos cuatro pesos.

  La fórmula está en la sección 5.2 de la especificación y no se toca sin
  cambiar también el documento y su test.
*/

export interface Pesos {
  wVisual: number
  wVelocidad: number
  wContinuidad: number
  wHerramientas: number
}

export interface ContextoPuntaje {
  /** Ambiente de la tarea colocada inmediatamente antes, o nulo al empezar. */
  ambienteAnterior: string | null
  /** Herramientas que la persona ya tiene a mano por el paso anterior. */
  herramientasEnMano: string[]
}

export const PESOS: Record<Modo, Pesos> = {
  arrancarYa: { wVisual: 3, wVelocidad: 2, wContinuidad: 1, wHerramientas: 1 },
  ambientePorAmbiente: { wVisual: 1, wVelocidad: 1, wContinuidad: 5, wHerramientas: 1 },
  puestaAPunto: { wVisual: 2, wVelocidad: 1, wContinuidad: 2, wHerramientas: 1 },
}

/*
  El orden de los verbos dentro de un mismo ambiente, para el modo
  `puestaAPunto`: primero se guarda, después se ordena, después se limpia,
  después se lava y al final se tira lo que sobró.
*/
export const VERBO_ORDEN: Record<Verbo, number> = {
  guardar: 0,
  ordenar: 1,
  limpiar: 2,
  lavar: 3,
  tirar: 4,
}

export function puntaje(tarea: Tarea, modo: Modo, contexto: ContextoPuntaje): number {
  const pesos = PESOS[modo]

  // `max(1, …)` protege el caso de una duración cero, que el validador del
  // catálogo ya prohíbe pero que puede llegar desde una tarea propia.
  const velocidad = 1 / Math.max(1, tarea.duracionMin)
  const continuidad = tarea.ambienteId === contexto.ambienteAnterior ? 1 : 0
  const tieneLasHerramientas = tarea.herramientas.every((herramienta) =>
    contexto.herramientasEnMano.includes(herramienta),
  )
    ? 1
    : 0

  return (
    pesos.wVisual * tarea.impactoVisual +
    pesos.wVelocidad * velocidad +
    pesos.wContinuidad * continuidad +
    pesos.wHerramientas * tieneLasHerramientas
  )
}
