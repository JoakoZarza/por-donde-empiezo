import { comparar } from './orden'

/*
  Los totales y los logros.

  Una sola regla gobierna todo esto: NADA BAJA NUNCA. No hay rachas, no hay vidas,
  no hay rojo, y la ausencia no se muestra como deuda. Por eso los totales no se
  calculan sobre el ciclo actual —que se reinicia cuando la persona quiere— sino
  sobre un registro que solo crece: cada tarea terminada se anota una vez y no se
  borra jamás.

  Ese registro es la diferencia entre «hiciste 4 tareas» y «llevás 137 tareas
  desde que empezaste», que es lo que hace que valga la pena volver.
*/

export interface MarcaDeHistorial {
  tareaId: string
  ambienteId: string
  minutos: number
  /** El instante en que se terminó, en ISO 8601. */
  hechoEn: string
}

export interface Totales {
  /** Tareas terminadas desde el principio, no las del ciclo actual. */
  tareas: number
  minutos: number
  /** Días distintos con al menos una tarea terminada. */
  diasActivos: number
  primeroEn: string | null
  ultimoEn: string | null
  /** La pausa más larga entre dos días de actividad, en días. */
  mayorPausaDias: number
}

export interface Logro {
  id: string
  nombre: string
  detalle: string
  conseguido: boolean
}

/*
  El día de una marca, en la forma `AAAA-MM-DD`.

  Se toma el día en horario universal, no el local. La diferencia solo aparece si
  alguien trabaja entre las nueve de la noche y la medianoche —que en Argentina cae
  en el día siguiente— y afecta a cuál día se le atribuye la tarea, no a cuántas
  tareas hizo. Cambia el reparto, no el total.
*/
function diaDe(instante: string): string {
  return instante.slice(0, 10)
}

/** Días enteros entre dos instantes. No lee el reloj: los dos se reciben. */
export function diasEntre(desde: string, hasta: string): number {
  return Math.floor((Date.parse(hasta) - Date.parse(desde)) / 86_400_000)
}

export function calcularTotales(historial: MarcaDeHistorial[]): Totales {
  if (historial.length === 0) {
    return { tareas: 0, minutos: 0, diasActivos: 0, primeroEn: null, ultimoEn: null, mayorPausaDias: 0 }
  }

  const dias = new Set<string>()
  let minutos = 0
  let primeroEn = historial[0]!.hechoEn
  let ultimoEn = historial[0]!.hechoEn

  for (const marca of historial) {
    minutos += marca.minutos
    dias.add(diaDe(marca.hechoEn))
    if (comparar(marca.hechoEn, primeroEn) < 0) primeroEn = marca.hechoEn
    if (comparar(marca.hechoEn, ultimoEn) > 0) ultimoEn = marca.hechoEn
  }

  // La pausa más larga entre dos días con actividad. Es lo que mide «Volviste»:
  // no cuánto hace que no venís, sino si alguna vez te fuiste y regresaste.
  const ordenados = [...dias].sort(comparar)
  let mayorPausaDias = 0
  for (let indice = 1; indice < ordenados.length; indice += 1) {
    const pausa = diasEntre(ordenados[indice - 1]!, ordenados[indice]!)
    if (pausa > mayorPausaDias) mayorPausaDias = pausa
  }

  return { tareas: historial.length, minutos, diasActivos: dias.size, primeroEn, ultimoEn, mayorPausaDias }
}

function logro(id: string, nombre: string, detalle: string, conseguido: boolean): Logro {
  return { id, nombre, detalle, conseguido }
}

/*
  Los logros se calculan, no se guardan. Guardarlos obligaría a mantener un segundo
  registro sincronizado con el primero, y ahí es donde aparecen los totales que
  mienten. Con una función pura, un logro conseguido no se puede perder: se vuelve a
  deducir del mismo registro que nunca se borra.
*/
export function calcularLogros(totales: Totales, cantidadDeAmbientes: number): Logro[] {
  const horas = totales.minutos / 60

  return [
    logro('primera', 'La primera', 'Terminaste tu primera tarea.', totales.tareas >= 1),
    logro('diez', 'Diez', 'Diez tareas terminadas.', totales.tareas >= 10),
    logro('cincuenta', 'Cincuenta', 'Cincuenta tareas terminadas.', totales.tareas >= 50),
    logro('hora', 'Una hora', 'Una hora entera de trabajo.', horas >= 1),
    logro('cinco-horas', 'Cinco horas', 'Cinco horas acumuladas.', horas >= 5),
    logro('tres-dias', 'Tres días', 'Trabajaste en tres días distintos.', totales.diasActivos >= 3),
    logro('siete-dias', 'Siete días', 'Trabajaste en siete días distintos.', totales.diasActivos >= 7),
    logro('casa-entera', 'La casa entera', 'Tocaste todos los ambientes.', cantidadDeAmbientes >= 8),
    logro('volviste', 'Volviste', 'Te tomaste unos días y volviste igual.', totales.mayorPausaDias >= 3),
  ]
}

/** Los logros ya conseguidos, en orden. */
export function logrosConseguidos(logros: Logro[]): Logro[] {
  return logros.filter((cada) => cada.conseguido)
}

/** Cuántos días pasaron desde la última vez, o nulo si todavía no hizo nada. */
export function diasSinVenir(totales: Totales, ahora: string): number | null {
  if (!totales.ultimoEn) return null
  return Math.max(0, diasEntre(totales.ultimoEn, ahora))
}
