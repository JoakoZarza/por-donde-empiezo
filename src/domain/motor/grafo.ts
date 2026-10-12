import { comparar } from '../orden'
import type { Tarea } from '../tipos'

/*
  El grafo de dependencias del plan.

  Solo cuenta las dependencias que están DENTRO del conjunto de tareas: una
  tarea que depende de otra que ya está hecha, o que la persona destildó, no
  tiene nada pendiente. Confundir eso con un error haría que el plan pidiera
  hacer cosas que no están en la lista.

  Los ciclos no deberían existir —el validador del catálogo los prohíbe— pero
  pueden llegar desde tareas propias o desde un catálogo mal escrito. Cuando
  aparecen, se rompe la arista de la tarea más larga, según la sección 5.2, y se
  reporta: el motor nunca falla en silencio.
*/

export interface Grafo {
  /** Para cada tarea, las dependencias suyas que están dentro del conjunto. */
  pendientesDe: Map<string, Set<string>>
  advertencias: string[]
}

export interface ResultadoCiclos {
  /** Ids de las tareas cuya arista de dependencia se quitó, en orden. */
  aristasRotas: string[]
}

/** Orden estable por id: el mismo grafo produce siempre el mismo resultado. */
function ordenados(ids: Iterable<string>): string[] {
  return [...ids].sort(comparar)
}

function dependenciasInternas(tareas: Tarea[]): Map<string, Set<string>> {
  const ids = new Set(tareas.map((tarea) => tarea.id))
  const pendientesDe = new Map<string, Set<string>>()
  for (const tarea of tareas) {
    pendientesDe.set(tarea.id, new Set(tarea.requiere.filter((id) => ids.has(id))))
  }
  return pendientesDe
}

/** Devuelve un ciclo como lista de ids, o nulo si el grafo es acíclico. */
function buscarCiclo(pendientesDe: Map<string, Set<string>>): string[] | null {
  const estado = new Map<string, 'visitando' | 'listo'>()
  const pila: string[] = []
  let encontrado: string[] | null = null

  const visitar = (id: string): void => {
    if (encontrado) return
    const actual = estado.get(id)
    if (actual === 'listo') return
    if (actual === 'visitando') {
      encontrado = pila.slice(pila.indexOf(id))
      return
    }

    estado.set(id, 'visitando')
    pila.push(id)
    for (const dependencia of ordenados(pendientesDe.get(id) ?? [])) {
      visitar(dependencia)
      if (encontrado) break
    }
    pila.pop()
    estado.set(id, 'listo')
  }

  for (const id of ordenados(pendientesDe.keys())) {
    visitar(id)
    if (encontrado) break
  }

  return encontrado
}

/** La tarea de mayor duración del ciclo. Si hay empate, la de id mayor. */
function masLarga(ciclo: string[], porId: Map<string, Tarea>): string {
  return ciclo.reduce((elegida, candidata) => {
    const duracionCandidata = porId.get(candidata)?.duracionMin ?? 0
    const duracionElegida = porId.get(elegida)?.duracionMin ?? 0
    if (duracionCandidata > duracionElegida) return candidata
    if (duracionCandidata === duracionElegida && comparar(candidata, elegida) > 0) return candidata
    return elegida
  })
}

function romperCiclos(tareas: Tarea[]): Grafo & { aristasRotas: string[] } {
  const porId = new Map(tareas.map((tarea) => [tarea.id, tarea]))
  const pendientesDe = dependenciasInternas(tareas)
  const aristasRotas: string[] = []
  const advertencias: string[] = []

  // Cada vuelta quita una arista, así que no puede haber más ciclos que aristas.
  const maxVueltas = tareas.reduce((total, tarea) => total + tarea.requiere.length, 0) + 1
  for (let vuelta = 0; vuelta < maxVueltas; vuelta++) {
    const ciclo = buscarCiclo(pendientesDe)
    if (!ciclo) break

    const larga = masLarga(ciclo, porId)
    const sucesor = ciclo[(ciclo.indexOf(larga) + 1) % ciclo.length]
    pendientesDe.get(larga)?.delete(sucesor)
    aristasRotas.push(larga)
    advertencias.push(
      `ciclo de dependencias entre ${ordenados(ciclo).join(', ')}: se quitó la dependencia de ${larga} sobre ${sucesor}, porque ${larga} es la más larga`,
    )
  }

  return { pendientesDe, aristasRotas, advertencias }
}

export function resolverCiclos(tareas: Tarea[]): ResultadoCiclos {
  return { aristasRotas: romperCiclos(tareas).aristasRotas }
}

export function construirGrafo(tareas: Tarea[]): Grafo {
  const { pendientesDe, advertencias } = romperCiclos(tareas)
  return { pendientesDe, advertencias }
}
