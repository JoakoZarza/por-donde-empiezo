import { expect, test } from 'vitest'
import { calcularResultados, resultadoAnterior } from './resultados'
import type { Paso } from './tipos'

/*
  La planilla de resultados.

  Es lo que la persona se lleva de la sesión además de las tareas hechas: cuánto
  había estimado el plan, cuánto tardó de verdad, y quién le ganó a quién.
*/

const MINUTOS = { a: 10, b: 5 }

function paso(tareaId: string, estado: Paso['estado'], segundosReales: number | null = null): Paso {
  return {
    tareaId,
    estado,
    hechoEn: estado === 'pendiente' ? null : '2026-10-10T21:00:00.000Z',
    segundosReales,
  }
}

test('la planilla compara lo estimado con lo que tardó de verdad', () => {
  // Una ganada (10 minutos estimados, 8 reales) y una perdida (5 estimados, 6 reales).
  const planilla = calcularResultados([paso('a', 'hecho', 480), paso('b', 'hecho', 360)], MINUTOS)

  expect(planilla.estimadoSegundos).toBe(900)
  expect(planilla.realSegundos).toBe(840)
  expect(planilla.diferenciaSegundos).toBe(60)
  expect(planilla.ganadas).toBe(1)
  expect(planilla.perdidas).toBe(1)
})

test('las tareas pendientes no cuentan en el resultado', () => {
  const planilla = calcularResultados([paso('a', 'hecho', 480), paso('b', 'pendiente')], MINUTOS)

  expect(planilla.realSegundos).toBe(480)
  expect(planilla.diferenciaSegundos).toBe(120)
  expect(planilla.tareas[1]?.realSegundos).toBeNull()
  expect(planilla.tareas[1]?.diferenciaSegundos).toBeNull()
})

test('clavar la estimación no es ganar ni perder', () => {
  const planilla = calcularResultados([paso('a', 'hecho', 600)], MINUTOS)

  expect(planilla.diferenciaSegundos).toBe(0)
  expect(planilla.ganadas).toBe(0)
  expect(planilla.perdidas).toBe(0)
})

test('una pausa larga se muestra pero no arruina el resultado', () => {
  // Una tarea de 10 minutos abierta ocho horas: la persona dejó el teléfono y volvió.
  const planilla = calcularResultados([paso('a', 'hecho', 8 * 3600), paso('b', 'hecho', 240)], MINUTOS)

  expect(planilla.tareas[0]?.conPausa).toBe(true)
  // El tiempo real se muestra igual, porque es la verdad del reloj.
  expect(planilla.tareas[0]?.realSegundos).toBe(8 * 3600)
  expect(planilla.conPausa).toBe(1)
  // Pero el resultado final solo cuenta la tarea que se hizo de corrido.
  expect(planilla.diferenciaSegundos).toBe(60)
  expect(planilla.realSegundos).toBe(8 * 3600 + 240)
})

test('una tarea lenta pero plausible NO es una pausa', () => {
  // Diez minutos estimados, veinticinco reales: es lentitud, y cuenta como perdida.
  const planilla = calcularResultados([paso('a', 'hecho', 25 * 60)], MINUTOS)

  expect(planilla.tareas[0]?.conPausa).toBe(false)
  expect(planilla.diferenciaSegundos).toBe(-900)
})

test('el resultado anterior es el de la tarea que se acaba de cerrar', () => {
  const anterior = resultadoAnterior([paso('a', 'hecho', 480), paso('b', 'pendiente')], 1, MINUTOS)

  expect(anterior?.tareaId).toBe('a')
  expect(anterior?.realSegundos).toBe(480)
  expect(anterior?.diferenciaSegundos).toBe(120)
})

test('en el primer paso no hay resultado anterior que mostrar', () => {
  expect(resultadoAnterior([paso('a', 'pendiente')], 0, MINUTOS)).toBeNull()
})

test('sin estimación conocida, todo el tiempo real cuenta como perdido', () => {
  // No se inventa una estimación para una tarea que ya no está: se dice la verdad.
  const planilla = calcularResultados([paso('desconocida', 'hecho', 120)], MINUTOS)

  expect(planilla.estimadoSegundos).toBe(0)
  expect(planilla.diferenciaSegundos).toBe(-120)
  expect(planilla.perdidas).toBe(1)
})

test('un plan sin nada cerrado no tiene resultado que mostrar', () => {
  const planilla = calcularResultados([paso('a', 'pendiente'), paso('b', 'pendiente')], MINUTOS)

  expect(planilla.realSegundos).toBe(0)
  expect(planilla.tareas.every((fila) => fila.realSegundos === null)).toBe(true)
})
