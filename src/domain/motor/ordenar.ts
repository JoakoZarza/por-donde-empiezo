import { puntaje, VERBO_ORDEN } from './puntaje'
import type { ContextoPuntaje } from './puntaje'
import type { Ambiente, Modo, Tarea } from '../tipos'

/*
  Ordena el resto del plan, después del paso de arranque.

  Es un orden topológico por selección repetida: en cada vuelta se mira qué
  tareas ya tienen todas sus dependencias colocadas y se elige la mejor según el
  modo. Así, la garantía G1 (nada antes de sus dependencias) no depende de que el
  comparador esté bien: es imposible elegir otra cosa.

  El comparador cambia por modo:
    - `arrancarYa` y `ambientePorAmbiente`: manda el puntaje.
    - `puestaAPunto`: manda el recorrido de la casa y, dentro del ambiente, el
      orden de los verbos (guardar, ordenar, limpiar, lavar, tirar).

  En todos los modos el desempate final es ambienteId y después id. Nunca se
  desempata por el orden en que llegaron los datos: es lo que hace que el
  resultado sea el mismo en cualquier navegador (garantía G5).
*/

export interface OpcionesOrden {
  tareas: Tarea[]
  ambientes: Ambiente[]
  pendientesDe: Map<string, Set<string>>
  modo: Modo
  /** Ambiente del paso de arranque ya fijado, o nulo si arranca de cero. */
  ambienteDeArranque: string | null
  /** Herramientas que ya exige el paso de arranque. */
  herramientasEnMano: string[]
}

function comparar(
  a: Tarea,
  b: Tarea,
  modo: Modo,
  contexto: ContextoPuntaje,
  recorrido: Map<string, number>,
): number {
  if (modo === 'puestaAPunto') {
    const recorridoA = recorrido.get(a.ambienteId) ?? 0
    const recorridoB = recorrido.get(b.ambienteId) ?? 0
    if (recorridoA !== recorridoB) return recorridoA - recorridoB

    const verboA = VERBO_ORDEN[a.verbo]
    const verboB = VERBO_ORDEN[b.verbo]
    if (verboA !== verboB) return verboA - verboB
  }

  const porPuntaje = puntaje(b, modo, contexto) - puntaje(a, modo, contexto)
  if (porPuntaje !== 0) return porPuntaje

  if (a.ambienteId !== b.ambienteId) return a.ambienteId.localeCompare(b.ambienteId)
  return a.id.localeCompare(b.id)
}

export function ordenarResto(opciones: OpcionesOrden): Tarea[] {
  const { tareas, ambientes, pendientesDe, modo } = opciones
  const recorrido = new Map(ambientes.map((ambiente) => [ambiente.id, ambiente.ordenRecorrido]))
  const porId = new Map(tareas.map((tarea) => [tarea.id, tarea]))

  const colocadas = new Set<string>()
  const orden: Tarea[] = []
  let contexto: ContextoPuntaje = {
    ambienteAnterior: opciones.ambienteDeArranque,
    herramientasEnMano: opciones.herramientasEnMano,
  }

  const estaDisponible = (tarea: Tarea): boolean =>
    [...(pendientesDe.get(tarea.id) ?? [])].every(
      (dependencia) => !porId.has(dependencia) || colocadas.has(dependencia),
    )

  while (orden.length < tareas.length) {
    const disponibles = tareas.filter((tarea) => !colocadas.has(tarea.id) && estaDisponible(tarea))

    // Con un grafo bien formado esto no pasa nunca. Si pasara, cortar es mejor
    // que quedarse en un bucle infinito.
    if (disponibles.length === 0) break

    const elegida = [...disponibles].sort((a, b) => comparar(a, b, modo, contexto, recorrido))[0]
    if (!elegida) break

    colocadas.add(elegida.id)
    orden.push(elegida)
    contexto = { ambienteAnterior: elegida.ambienteId, herramientasEnMano: elegida.herramientas }
  }

  return orden
}
