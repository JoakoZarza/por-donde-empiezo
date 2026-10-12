import type { Ambiente, Tarea } from './tipos'

/*
  El plano de la casa: el estado de cada ambiente, de un vistazo.

  Tres reglas del producto viven acá.

  La primera: el plano NUNCA comunica solo por color. Cada cuarto lleva su estado
  como dato además de su luz, porque un plano que solo se distingue por el brillo
  deja afuera a quien no distingue bien los colores, y porque «a medias» no es un
  color: es un número.

  La segunda: el estado de un ambiente solo cambia cuando la persona hace algo. Nada
  de acá depende del paso del tiempo, así que un cuarto no se apaga por no entrar.

  La tercera: la luz mide el ciclo actual, no la historia. Es lo que la persona ve
  cambiar mientras trabaja, y por eso el plano se ilumina con lo de hoy. Los totales
  de siempre viven en «Lo que hiciste»: acá manda el presente.
*/

export type EstadoDelAmbiente = 'sinElegir' | 'sinEmpezar' | 'aMedias' | 'alDia'

export interface Cuarto {
  ambienteId: string
  nombre: string
  ordenRecorrido: number
  total: number
  hechas: number
  estado: EstadoDelAmbiente
  /** Cuánto se ilumina, de 0 a 1. */
  luz: number
}

export interface EntradaCasa {
  /** La casa entera, para que el plano la muestre completa y no solo lo elegido. */
  catalogo: Ambiente[]
  /** Los ambientes que la persona eligió. */
  elegidos: Ambiente[]
  tareasPorAmbiente: Record<string, Tarea[]>
  /** Ids de las hechas en el ciclo actual, por ambiente. */
  hechasPorAmbiente: Record<string, string[]>
}

export function armarLaCasa(entrada: EntradaCasa): Cuarto[] {
  const elegidos = new Set(entrada.elegidos.map((ambiente) => ambiente.id))

  return [...entrada.catalogo]
    .sort((a, b) => a.ordenRecorrido - b.ordenRecorrido)
    .map((ambiente) => {
      const total = (entrada.tareasPorAmbiente[ambiente.id] ?? []).length
      const hechas = (entrada.hechasPorAmbiente[ambiente.id] ?? []).length
      const base = {
        ambienteId: ambiente.id,
        nombre: ambiente.nombre,
        ordenRecorrido: ambiente.ordenRecorrido,
        total,
        hechas,
      }

      if (!elegidos.has(ambiente.id)) return { ...base, estado: 'sinElegir' as const, luz: 0 }
      if (total === 0 || hechas === 0) return { ...base, estado: 'sinEmpezar' as const, luz: 0 }
      if (hechas >= total) return { ...base, estado: 'alDia' as const, luz: 1 }

      return { ...base, estado: 'aMedias' as const, luz: hechas / total }
    })
}
