import { expect, test } from 'vitest'
import { enReloj, estadoDelReto, finDelReto, resumenDelReto, segundosRestantes } from './contrarreloj'
import type { Paso } from './tipos'

/*
  El contrarreloj.

  Lo que se prueba acá es, sobre todo, que perder no cuesta nada y que ganar le gana
  al reloj. Un contrarreloj que castiga es lo contrario de esta app.
*/

function paso(tareaId: string, estado: Paso['estado']): Paso {
  return { tareaId, estado, hechoEn: estado === 'hecho' ? '2026-10-10T21:00:00.000Z' : null }
}

const MINUTOS = { 'a': 5, 'b': 10, 'c': 20 }

test('el final del reto se deduce del plan: recargar la página no lo pierde', () => {
  const fin = finDelReto('2026-10-10T21:00:00.000Z', 600)
  expect(fin).toBe('2026-10-10T21:10:00.000Z')
})

test('sin presupuesto no hay reto', () => {
  expect(finDelReto('2026-10-10T21:00:00.000Z', null)).toBeNull()
})

test('los segundos restantes nunca son negativos', () => {
  const fin = '2026-10-10T21:10:00.000Z'
  expect(segundosRestantes(fin, '2026-10-10T21:05:00.000Z')).toBe(300)
  expect(segundosRestantes(fin, '2026-10-10T21:30:00.000Z')).toBe(0)
  expect(segundosRestantes(fin, fin)).toBe(0)
})

test('el reloj se escribe con dos dígitos, y con horas cuando hace falta', () => {
  expect(enReloj(0)).toBe('00:00')
  expect(enReloj(9)).toBe('00:09')
  expect(enReloj(65)).toBe('01:05')
  expect(enReloj(600)).toBe('10:00')
  expect(enReloj(3661)).toBe('1:01:01')
})

test('el resumen cuenta hechas, salteadas y pendientes, y suma los minutos hechos', () => {
  const resumen = resumenDelReto([paso('a', 'hecho'), paso('b', 'hecho'), paso('c', 'salteado')], MINUTOS)

  expect(resumen.hechos).toBe(2)
  expect(resumen.saltados).toBe(1)
  expect(resumen.pendientes).toBe(0)
  expect(resumen.total).toBe(3)
  expect(resumen.minutosHechos).toBe(15)
})

test('una tarea sin minutos conocidos suma cero y no rompe la cuenta', () => {
  const resumen = resumenDelReto([paso('desconocida', 'hecho')], MINUTOS)
  expect(resumen.minutosHechos).toBe(0)
  expect(Number.isNaN(resumen.minutosHechos)).toBe(false)
})

test('GANAR LE GANA AL RELOJ: sin nada pendiente el reto está cumplido, aunque el tiempo se haya agotado', () => {
  const todoHecho = resumenDelReto([paso('a', 'hecho')], MINUTOS)
  expect(estadoDelReto(todoHecho, 0)).toBe('cumplido')

  const quedanCosas = resumenDelReto([paso('a', 'hecho'), paso('b', 'pendiente')], MINUTOS)
  expect(estadoDelReto(quedanCosas, 0)).toBe('seAcaboElTiempo')
  expect(estadoDelReto(quedanCosas, 60)).toBe('enCurso')
})

test('saltear todas las tareas también cierra el reto', () => {
  // «Saltear» es una decisión, no un pendiente. Si quedara pendiente, el reto no
  // terminaría nunca y la persona quedaría con un reloj en cero para siempre.
  const todoSalteado = resumenDelReto([paso('a', 'salteado'), paso('b', 'salteado')], MINUTOS)
  expect(todoSalteado.pendientes).toBe(0)
  expect(estadoDelReto(todoSalteado, 0)).toBe('cumplido')
})
