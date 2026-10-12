import type { Paso } from './tipos'

/*
  El contrarreloj.

  Un reto es un plan común con un presupuesto de tiempo: el orden de las tareas es el
  mismo que la persona ya conoce. Y no hace falta guardar nada nuevo, porque el final
  del reto se deduce del momento en que se armó el plan más su presupuesto. Eso
  significa que recargar la página no pierde el reloj.

  Una regla del producto manda sobre todo lo demás: PERDER UN RETO NO CUESTA NADA.
  No hay racha que se corte, no hay total que baje, no hay rojo. Cuando el tiempo se
  acaba el reto terminó, pero lo que se hizo queda hecho y anotado igual que siempre.
  Por eso el estado posible no se llama «perdido», se llama «se acabó el tiempo».
*/

export type EstadoDelReto = 'enCurso' | 'cumplido' | 'seAcaboElTiempo'

export interface ResumenDelReto {
  hechos: number
  saltados: number
  pendientes: number
  total: number
  /** Minutos de las tareas efectivamente terminadas. */
  minutosHechos: number
}

export function resumenDelReto(pasos: Paso[], minutosPorTarea: Record<string, number>): ResumenDelReto {
  let hechos = 0
  let saltados = 0
  let pendientes = 0
  let minutosHechos = 0

  for (const paso of pasos) {
    if (paso.estado === 'hecho') {
      hechos += 1
      minutosHechos += minutosPorTarea[paso.tareaId] ?? 0
    } else if (paso.estado === 'salteado') {
      saltados += 1
    } else {
      pendientes += 1
    }
  }

  return { hechos, saltados, pendientes, total: pasos.length, minutosHechos }
}

/** El instante en que se termina el reto, o nulo si el plan no tiene presupuesto. */
export function finDelReto(creadoEn: string, presupuestoSegundos: number | null): string | null {
  if (presupuestoSegundos === null) return null
  return new Date(Date.parse(creadoEn) + presupuestoSegundos * 1000).toISOString()
}

export function segundosRestantes(fin: string, ahora: string): number {
  return Math.max(0, Math.floor((Date.parse(fin) - Date.parse(ahora)) / 1000))
}

export function estadoDelReto(resumen: ResumenDelReto, segundos: number): EstadoDelReto {
  // Ganar le gana a cualquier reloj: si no queda nada pendiente, el reto está
  // cumplido aunque el tiempo se haya agotado en el mismo instante.
  if (resumen.pendientes === 0) return 'cumplido'
  if (segundos <= 0) return 'seAcaboElTiempo'
  return 'enCurso'
}

/** El reloj en `MM:SS`, o en `H:MM:SS` si pasa de una hora. */
export function enReloj(segundos: number): string {
  const totales = Math.max(0, segundos)
  const horas = Math.floor(totales / 3600)
  const minutos = Math.floor((totales % 3600) / 60)
  const resto = totales % 60
  const dosDigitos = (valor: number): string => String(valor).padStart(2, '0')

  return horas > 0 ? `${horas}:${dosDigitos(minutos)}:${dosDigitos(resto)}` : `${dosDigitos(minutos)}:${dosDigitos(resto)}`
}

/*
  El reloj de carrera.

  En vez de bajar hasta cero, sube desde cero, y al lado va la diferencia contra lo
  que estaba estimado para el trabajo ya hecho. Si hiciste veinte minutos de tareas
  en dieciséis, vas +4:00; si tardaste veinticuatro, vas −4:00. Es la misma
  información que una cuenta atrás, pero al derecho: dice cuánto llevás ganado en vez
  de cuánto te queda, y eso se siente distinto —y para mucha gente, mejor—.

  La desventaja NO cuesta nada: no se descuenta de ningún total, no corta ninguna
  racha. Es un resultado de carrera, no una multa.
*/

/** Los segundos que pasaron desde que se armó el plan. */
export function segundosTranscurridos(creadoEn: string, ahora: string): number {
  return Math.max(0, Math.floor((Date.parse(ahora) - Date.parse(creadoEn)) / 1000))
}

/** Los segundos ganados (positivos) o perdidos (negativos) contra lo estimado. */
export function ventajaSegundos(minutosHechos: number, transcurridos: number): number {
  return minutosHechos * 60 - transcurridos
}

/** La ventaja con su signo: `+2:30`, `−1:05`. El menos es tipográfico, no un guion. */
export function enVentaja(segundos: number): string {
  return `${segundos < 0 ? '−' : '+'}${enReloj(Math.abs(segundos))}`
}
