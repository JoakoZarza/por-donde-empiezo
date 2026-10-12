import { expect, test } from 'vitest'
import {
  enReloj,
  enVentaja,
  estadoDelReto,
  finDelReto,
  resumenDelReto,
  segundosRestantes,
  segundosTranscurridos,
  ventajaSegundos,
} from './contrarreloj'
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

test('el reloj de carrera sube, y nunca va para atrás', () => {
  const creado = '2026-10-10T21:00:00.000Z'
  expect(segundosTranscurridos(creado, '2026-10-10T21:05:00.000Z')).toBe(300)
  // Un teléfono con la fecha mal puesta no puede mostrar un tiempo negativo.
  expect(segundosTranscurridos(creado, '2026-10-10T20:00:00.000Z')).toBe(0)
})

test('la ventaja se mide contra lo estimado para el trabajo hecho', () => {
  // Veinte minutos de tareas hechos en dieciséis: cuatro minutos ganados.
  expect(ventajaSegundos(20, 16 * 60)).toBe(240)
  // Los mismos veinte en veinticuatro: cuatro perdidos.
  expect(ventajaSegundos(20, 24 * 60)).toBe(-240)
  // Sin nada hecho y sin tiempo corrido, la carrera está empatada.
  expect(ventajaSegundos(0, 0)).toBe(0)
})

test('la ventaja se escribe con signo, y con el menos tipográfico', () => {
  expect(enVentaja(150)).toBe('+02:30')
  expect(enVentaja(-65)).toBe('−01:05')
  expect(enVentaja(0)).toBe('+00:00')
  // El menos es el carácter «−» (U+2212), no un guion: en la tipografía de display
  // se nota, y AGENTS.md pide los caracteres tipográficos.
  expect(enVentaja(-1)).not.toContain('-')
})
