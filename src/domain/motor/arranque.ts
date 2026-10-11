import { puntaje } from './puntaje'
import type { ContextoPuntaje } from './puntaje'
import type { EntradaPlan, Modo, Tarea } from '../tipos'

/*
  El arranque: por dónde empieza el plan. Son las garantías que sostienen la
  promesa del producto (sección 5.2, pasos 3 y 4, y garantía G2):

    - El primer paso dura 2 minutos o menos y no tiene dependencias pendientes.
    - El ambiente donde cae es el más desordenado, salvo en `puestaAPunto`, donde
      manda el recorrido de la casa.

  Si el ambiente elegido no tuviera ninguna tarea de 2 minutos, se usa la más
  corta y se deja una advertencia. Ese caso no debería ocurrir —el validador del
  catálogo lo prohíbe— pero puede pasar cuando el filtro por herramientas se lleva
  justo esa tarea, y el motor no puede romper la promesa en silencio.
*/

function contarPorAmbiente(tareasDisponibles: Tarea[]): Map<string, number> {
  const cuenta = new Map<string, number>()
  for (const tarea of tareasDisponibles) {
    cuenta.set(tarea.ambienteId, (cuenta.get(tarea.ambienteId) ?? 0) + 1)
  }
  return cuenta
}

export function elegirAmbienteDeArranque(
  entrada: EntradaPlan,
  tareasDisponibles: Tarea[],
): string | null {
  const cuenta = contarPorAmbiente(tareasDisponibles)
  const candidatos = entrada.ambientes.filter((ambiente) => (cuenta.get(ambiente.id) ?? 0) > 0)
  if (candidatos.length === 0) return null

  const ordenados = [...candidatos].sort((a, b) => {
    if (entrada.modo === 'puestaAPunto') {
      if (a.ordenRecorrido !== b.ordenRecorrido) return a.ordenRecorrido - b.ordenRecorrido
      return a.id.localeCompare(b.id)
    }

    const porCantidad = (cuenta.get(b.id) ?? 0) - (cuenta.get(a.id) ?? 0)
    if (porCantidad !== 0) return porCantidad

    // La puesta al día más antigua gana, y «nunca» le gana a cualquier fecha.
    const fechaA = a.ultimaPuestaAlDia ?? ''
    const fechaB = b.ultimaPuestaAlDia ?? ''
    if (fechaA !== fechaB) return fechaA.localeCompare(fechaB)

    return a.id.localeCompare(b.id)
  })

  return ordenados[0]?.id ?? null
}

export interface PasoDeArranque {
  tarea: Tarea
  advertencia: string | null
}

export function elegirPasoDeArranque(
  tareasDelAmbiente: Tarea[],
  pendientesDe: Map<string, Set<string>>,
  contexto: ContextoPuntaje,
  modo: Modo,
): PasoDeArranque | null {
  if (tareasDelAmbiente.length === 0) return null

  const sinPendientes = tareasDelAmbiente.filter((tarea) => (pendientesDe.get(tarea.id)?.size ?? 0) === 0)
  // Defensivo: si absolutamente todo tuviera dependencias pendientes, el grafo no
  // se rompió bien. Es mejor devolver algo que dejar el plan sin primer paso.
  const disponibles = sinPendientes.length > 0 ? sinPendientes : tareasDelAmbiente

  const cortas = disponibles.filter((tarea) => tarea.duracionMin <= 2)
  if (cortas.length > 0) {
    const elegida = [...cortas].sort((a, b) => {
      const porPuntaje = puntaje(b, modo, contexto) - puntaje(a, modo, contexto)
      return porPuntaje !== 0 ? porPuntaje : a.id.localeCompare(b.id)
    })[0]
    if (elegida) return { tarea: elegida, advertencia: null }
  }

  const masCorta = [...disponibles].sort((a, b) => {
    const porDuracion = a.duracionMin - b.duracionMin
    return porDuracion !== 0 ? porDuracion : a.id.localeCompare(b.id)
  })[0]
  if (!masCorta) return null

  return {
    tarea: masCorta,
    advertencia: `ninguna tarea de 2 minutos sin dependencias en ${masCorta.ambienteId}: se usa la más corta, de ${masCorta.duracionMin} minutos`,
  }
}
