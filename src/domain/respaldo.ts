import type { Ambiente, MarcaDeCiclo, MarcaDeHistorial, Plan, Preferencias, Tarea } from './tipos'

/*
  Llevar el trabajo de un teléfono a otro, sin servidor y sin cuenta.

  Sincronizar de verdad necesita un servidor; un servidor necesita una cuenta; y una
  cuenta rompe la promesa de que ninguna función de esta app exige una. Así que esto
  hace lo mismo que haría la sincronización —mover el trabajo de un dispositivo a
  otro— sin que nada salga de los teléfonos si la persona no lo saca a propósito.

  Es un archivo, y se lo manda por donde quiera: WhatsApp, correo, un cable.
*/

export const VERSION_DEL_RESPALDO = 1

export interface Respaldo {
  version: number
  generadoEn: string
  ambientes: Ambiente[]
  tareas: Tarea[]
  hechas: MarcaDeCiclo[]
  historial: MarcaDeHistorial[]
  planes: Plan[]
  preferencias: Preferencias
}

export interface DatosDelRespaldo {
  ambientes: Ambiente[]
  tareas: Tarea[]
  hechas: MarcaDeCiclo[]
  historial: MarcaDeHistorial[]
  planes: Plan[]
  preferencias: Preferencias
}

export function armarRespaldo(datos: DatosDelRespaldo, generadoEn: string): Respaldo {
  return { version: VERSION_DEL_RESPALDO, generadoEn, ...datos }
}

/** Un problema con el archivo, con un mensaje que se le puede mostrar a la persona. */
export class RespaldoInvalido extends Error {}

/*
  Leer un archivo que viene de afuera es leer algo que puede estar mal: el archivo
  equivocado, uno a medio bajar, o uno de otra versión de la app. Cada caso tiene su
  mensaje, porque «error al importar» no le sirve a nadie.
*/
export function leerRespaldo(texto: string): Respaldo {
  let crudo: unknown
  try {
    crudo = JSON.parse(texto)
  } catch {
    throw new RespaldoInvalido('Ese archivo no se entiende: no parece una copia de esta app.')
  }

  if (typeof crudo !== 'object' || crudo === null) {
    throw new RespaldoInvalido('El archivo está vacío.')
  }

  const posible = crudo as Partial<Respaldo>

  if (posible.version !== VERSION_DEL_RESPALDO) {
    const encontrada = posible.version === undefined ? 'sin número de versión' : `la versión ${posible.version}`
    throw new RespaldoInvalido(
      `Ese archivo es de ${encontrada}, y esta app lee la ${VERSION_DEL_RESPALDO}.`,
    )
  }

  const listas: (keyof Respaldo)[] = ['ambientes', 'tareas', 'hechas', 'historial', 'planes']
  for (const campo of listas) {
    if (!Array.isArray(posible[campo])) {
      throw new RespaldoInvalido(`A la copia le falta «${campo}», así que está incompleta.`)
    }
  }

  if (typeof posible.preferencias !== 'object' || posible.preferencias === null) {
    throw new RespaldoInvalido('A la copia le faltan los ajustes.')
  }

  return posible as Respaldo
}

/** El nombre del archivo, con la fecha adentro para reconocerlo después. */
export function nombreDelArchivo(generadoEn: string): string {
  return `por-donde-empiezo-${generadoEn.slice(0, 10)}.json`
}
