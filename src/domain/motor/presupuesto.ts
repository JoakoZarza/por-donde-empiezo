import type { Tarea } from '../tipos'

/*
  El recorte al tiempo disponible.

  Dos garantías viven acá:
    - G4: el plan nunca se pasa del presupuesto que eligió la persona.
    - G6: si el presupuesto es tan chico que no entra nada útil, el plan lo dice
      en vez de devolver una lista vacía sin explicación.

  Y una regla que no es obvia: si una tarea no entra, sus dependientes tampoco,
  aunque por duración entren solos. Trapear sin haber barrido no es medio plan:
  es un plan que no sirve.
*/

/** «1 minuto» y «12 minutos»: sin esto la app dice «con 1 minutos». */
function enMinutos(cantidad: number): string {
  return `${cantidad} ${cantidad === 1 ? 'minuto' : 'minutos'}`
}

export interface ResultadoRecorte {
  conservadas: Tarea[]
  /** Minutos de las tareas que quedaron afuera. */
  minutosFaltantes: number
  advertencias: string[]
}

export function recortarAlPresupuesto(
  tareasOrdenadas: Tarea[],
  pendientesDe: Map<string, Set<string>>,
  presupuestoMin: number | null,
): ResultadoRecorte {
  if (presupuestoMin === null) {
    return { conservadas: tareasOrdenadas, minutosFaltantes: 0, advertencias: [] }
  }

  const idsDelPlan = new Set(tareasOrdenadas.map((tarea) => tarea.id))
  const conservadas: Tarea[] = []
  const idsConservados = new Set<string>()
  const advertencias: string[] = []
  let minutos = 0
  let minutosFaltantes = 0

  for (const tarea of tareasOrdenadas) {
    // Solo cuentan las dependencias que están dentro del plan: las de afuera ya
    // están satisfechas.
    const dependencias = [...(pendientesDe.get(tarea.id) ?? [])].filter((id) => idsDelPlan.has(id))
    const entra = minutos + tarea.duracionMin <= presupuestoMin
    const dependenciasListas = dependencias.every((id) => idsConservados.has(id))

    if (entra && dependenciasListas) {
      conservadas.push(tarea)
      idsConservados.add(tarea.id)
      minutos += tarea.duracionMin
    } else {
      minutosFaltantes += tarea.duracionMin
    }
  }

  if (tareasOrdenadas.length > 0 && conservadas.length === 0) {
    const masCorta = Math.min(...tareasOrdenadas.map((tarea) => tarea.duracionMin))
    advertencias.push(
      `con ${enMinutos(presupuestoMin)} no entra ninguna tarea: la más corta dura ${enMinutos(masCorta)}`,
    )
  } else if (minutosFaltantes > 0) {
    advertencias.push(
      `quedaron ${enMinutos(minutosFaltantes)} de tareas afuera del presupuesto de ${enMinutos(presupuestoMin)}`,
    )
  }

  return { conservadas, minutosFaltantes, advertencias }
}
