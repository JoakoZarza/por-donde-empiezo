import { expect, test } from 'vitest'
import { PESOS, VERBO_ORDEN, puntaje } from './puntaje'
import type { ContextoPuntaje } from './puntaje'
import type { Tarea } from '../tipos'

function tarea(extra: Partial<Tarea> = {}): Tarea {
  return {
    id: 'x',
    ambienteId: 'cocina',
    subAmbienteId: null,
    objetoId: null,
    verbo: 'limpiar',
    accion: 'Limpiá',
    descripcion: 'algo',
    duracionMin: 5,
    esfuerzo: 1,
    impactoVisual: 1,
    requiere: [],
    herramientas: [],
    esDelCatalogo: true,
    notas: null,
    ...extra,
  }
}

const sinNada: ContextoPuntaje = { ambienteAnterior: null, herramientasEnMano: [] }

test('la tabla de pesos coincide con la especificación', () => {
  expect(PESOS.arrancarYa).toEqual({ wVisual: 3, wVelocidad: 2, wContinuidad: 1, wHerramientas: 1 })
  expect(PESOS.ambientePorAmbiente).toEqual({ wVisual: 1, wVelocidad: 1, wContinuidad: 5, wHerramientas: 1 })
  expect(PESOS.puestaAPunto).toEqual({ wVisual: 2, wVelocidad: 1, wContinuidad: 2, wHerramientas: 1 })
})

test('en arrancarYa el impacto visual le gana a la velocidad', () => {
  const llamativaYLenta = tarea({ duracionMin: 20, impactoVisual: 3 })
  const discretaYRápida = tarea({ duracionMin: 2, impactoVisual: 1 })
  expect(puntaje(llamativaYLenta, 'arrancarYa', sinNada)).toBeGreaterThan(
    puntaje(discretaYRápida, 'arrancarYa', sinNada),
  )
})

test('la continuidad de ambiente suma cuando coincide', () => {
  const enCocina = tarea({ ambienteId: 'cocina' })
  const mismoAmbiente: ContextoPuntaje = { ambienteAnterior: 'cocina', herramientasEnMano: [] }
  const otroAmbiente: ContextoPuntaje = { ambienteAnterior: 'bano', herramientasEnMano: [] }
  expect(puntaje(enCocina, 'ambientePorAmbiente', mismoAmbiente)).toBeGreaterThan(
    puntaje(enCocina, 'ambientePorAmbiente', otroAmbiente),
  )
})

test('la continuidad pesa más en ambientePorAmbiente que en arrancarYa', () => {
  const enCocina = tarea({ ambienteId: 'cocina' })
  const mismoAmbiente: ContextoPuntaje = { ambienteAnterior: 'cocina', herramientasEnMano: [] }
  const otroAmbiente: ContextoPuntaje = { ambienteAnterior: 'bano', herramientasEnMano: [] }
  const diferencia = (modo: 'arrancarYa' | 'ambientePorAmbiente') =>
    puntaje(enCocina, modo, mismoAmbiente) - puntaje(enCocina, modo, otroAmbiente)
  expect(diferencia('ambientePorAmbiente')).toBeGreaterThan(diferencia('arrancarYa'))
})

test('las herramientas en mano suman solo si están todas', () => {
  const necesitaDos = tarea({ herramientas: ['trapo', 'balde'] })
  const conAmbas: ContextoPuntaje = { ambienteAnterior: null, herramientasEnMano: ['trapo', 'balde'] }
  const conUna: ContextoPuntaje = { ambienteAnterior: null, herramientasEnMano: ['trapo'] }
  expect(puntaje(necesitaDos, 'arrancarYa', conAmbas)).toBeGreaterThan(
    puntaje(necesitaDos, 'arrancarYa', conUna),
  )
})

test('una tarea sin herramientas suma el bonus sin pedir nada', () => {
  const sinHerramientas = tarea({ herramientas: [] })
  const sinHerramientasEnMano = tarea({ herramientas: ['trapo'] })
  expect(puntaje(sinHerramientas, 'arrancarYa', sinNada)).toBeGreaterThan(
    puntaje(sinHerramientasEnMano, 'arrancarYa', sinNada),
  )
})

test('una duración de cero no rompe la velocidad', () => {
  expect(Number.isFinite(puntaje(tarea({ duracionMin: 0 }), 'arrancarYa', sinNada))).toBe(true)
})

test('el orden de los verbos es guardar, ordenar, limpiar, lavar, tirar', () => {
  expect(VERBO_ORDEN).toEqual({ guardar: 0, ordenar: 1, limpiar: 2, lavar: 3, tirar: 4 })
})
