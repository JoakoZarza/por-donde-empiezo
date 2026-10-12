import type { Paso } from './tipos'

/*
  La planilla de resultados.

  Es la misma cuenta del reloj de carrera, pero guardada en vez de en vivo. En vivo
  es ruido: un número que cambia mientras trabajás y que no podés mirar porque estás
  trabajando. Como resultado de la tarea que acabás de terminar, en cambio, es
  información: dice si le ganaste o le perdiste a la estimación, y por cuánto.

  Y al final queda la planilla completa: tarea por tarea, lo estimado, lo que tardaste
  de verdad, y el resultado. Eso es lo que la persona se lleva de la sesión, más allá
  de las tareas hechas.
*/

export interface ResultadoDeUnaTarea {
  tareaId: string
  /** Lo que el plan estimaba para esa tarea, en segundos. */
  estimadoSegundos: number
  /** Lo que tardó de verdad. Nulo si todavía no se cerró. */
  realSegundos: number | null
  /** Estimado menos real. Positivo es tiempo ganado, negativo es perdido. */
  diferenciaSegundos: number | null
  /**
   * Si tardó tanto que lo más probable es que la persona haya dejado el teléfono y
   * vuelto mucho después. El tiempo real se muestra igual —es la verdad del reloj—,
   * pero no se cuenta en el resultado final: una noche entera no es un resultado de
   * carrera, y contarla arruinaría el número que la persona sí ganó trabajando.
   */
  conPausa: boolean
}

export interface PlanillaDeResultados {
  tareas: ResultadoDeUnaTarea[]
  estimadoSegundos: number
  realSegundos: number
  /** Estimado menos real, contando solo las tareas sin pausa. */
  diferenciaSegundos: number
  ganadas: number
  perdidas: number
  conPausa: number
}

/*
  El umbral de pausa: cinco veces lo estimado más media hora. Es generoso a
  propósito. Una tarea de 10 minutos tarda en considerarse pausa más de 80, y en ese
  rango ya no es lentitud: es que la persona se fue.
*/
function esPausa(estimadoSegundos: number, realSegundos: number): boolean {
  return realSegundos > estimadoSegundos * 5 + 30 * 60
}

export function calcularResultados(
  pasos: Paso[],
  minutosPorTarea: Record<string, number>,
): PlanillaDeResultados {
  const tareas: ResultadoDeUnaTarea[] = []
  let estimadoSegundos = 0
  let realSegundos = 0
  let diferenciaSegundos = 0
  let ganadas = 0
  let perdidas = 0
  let conPausa = 0

  for (const paso of pasos) {
    const estimado = (minutosPorTarea[paso.tareaId] ?? 0) * 60
    const real = paso.segundosReales ?? null
    const pausa = real !== null && esPausa(estimado, real)
    const diferencia = real === null || pausa ? null : estimado - real

    tareas.push({
      tareaId: paso.tareaId,
      estimadoSegundos: estimado,
      realSegundos: real,
      diferenciaSegundos: diferencia,
      conPausa: pausa,
    })

    if (real === null) continue

    estimadoSegundos += estimado
    realSegundos += real

    if (pausa) {
      conPausa += 1
      continue
    }

    diferenciaSegundos += diferencia ?? 0
    // Una diferencia de cero no es ni ganada ni perdida: clavó la estimación.
    if ((diferencia ?? 0) > 0) ganadas += 1
    else if ((diferencia ?? 0) < 0) perdidas += 1
  }

  return { tareas, estimadoSegundos, realSegundos, diferenciaSegundos, ganadas, perdidas, conPausa }
}

/**
 * El resultado de la tarea que se acaba de cerrar, para mostrarlo al entrar al paso
 * siguiente. Nulo si no hay anterior, o si la anterior no se cerró.
 */
export function resultadoAnterior(
  pasos: Paso[],
  indice: number,
  minutosPorTarea: Record<string, number>,
): ResultadoDeUnaTarea | null {
  if (indice <= 0) return null
  const anterior = pasos[indice - 1]
  if (!anterior || anterior.estado === 'pendiente') return null
  return calcularResultados([anterior], minutosPorTarea).tareas[0] ?? null
}
