import { expect, test } from 'vitest'
import { elegirAmbienteDeArranque, elegirPasoDeArranque } from './arranque'
import type { ContextoPuntaje } from './puntaje'
import type { Ambiente, EntradaPlan, Modo, Tarea } from '../tipos'

/*
  El arranque es la promesa central del producto: la primera tarea nunca dura
  más de dos minutos y no depende de nada. Estos tests son los que la sostienen
  (garantía G2), incluidos los empates, que es donde un orden no determinístico
  se esconde.
*/

function ambiente(id: string, extra: Partial<Ambiente> = {}): Ambiente {
  return {
    id,
    hogarId: 'h',
    tipo: 'cocina',
    nombre: id,
    ordenRecorrido: 1,
    ultimaPuestaAlDia: null,
    vecesAlDia: 0,
    ...extra,
  }
}

function tarea(id: string, ambienteId: string, extra: Partial<Tarea> = {}): Tarea {
  return {
    id,
    ambienteId,
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

function entrada(ambientes: Ambiente[], tareas: Tarea[], modo: Modo = 'arrancarYa'): EntradaPlan {
  return {
    ambientes,
    tareas,
    hechasEnCiclo: [],
    presupuestoMin: null,
    modo,
    herramientasDisponibles: ['escoba', 'trapo', 'balde', 'detergente'],
  }
}

const SIN_PENDIENTES = new Map<string, Set<string>>()
const CTX: ContextoPuntaje = { ambienteAnterior: null, herramientasEnMano: ['escoba', 'trapo', 'balde'] }

test('elige el ambiente con más tareas pendientes', () => {
  const ambientes = [ambiente('a'), ambiente('b')]
  const tareas = [tarea('a1', 'a'), tarea('a2', 'a'), tarea('a3', 'a'), tarea('b1', 'b')]
  expect(elegirAmbienteDeArranque(entrada(ambientes, tareas), tareas)).toBe('a')
})

test('en caso de empate gana el de ultimaPuestaAlDia más antigua', () => {
  const ambientes = [
    ambiente('a', { ultimaPuestaAlDia: '2026-10-08T00:00:00.000Z' }),
    ambiente('b', { ultimaPuestaAlDia: '2026-09-01T00:00:00.000Z' }),
  ]
  const tareas = [tarea('a1', 'a'), tarea('b1', 'b')]
  expect(elegirAmbienteDeArranque(entrada(ambientes, tareas), tareas)).toBe('b')
})

test('si nunca se puso al día, ese gana el empate', () => {
  const ambientes = [
    ambiente('a', { ultimaPuestaAlDia: '2026-10-08T00:00:00.000Z' }),
    ambiente('b', { ultimaPuestaAlDia: null }),
  ]
  const tareas = [tarea('a1', 'a'), tarea('b1', 'b')]
  expect(elegirAmbienteDeArranque(entrada(ambientes, tareas), tareas)).toBe('b')
})

test('ante empate total desempata por ambienteId ascendente', () => {
  // El orden del arreglo de ambientes no debe importar.
  const ambientes = [ambiente('b'), ambiente('a')]
  const tareas = [tarea('a1', 'a'), tarea('b1', 'b')]
  expect(elegirAmbienteDeArranque(entrada(ambientes, tareas), tareas)).toBe('a')
})

test('en puestaAPunto elige el primero del recorrido, no el más desordenado', () => {
  const ambientes = [ambiente('a', { ordenRecorrido: 1 }), ambiente('b', { ordenRecorrido: 2 })]
  const tareas = [tarea('a1', 'a'), tarea('b1', 'b'), tarea('b2', 'b'), tarea('b3', 'b')]
  const conModo = { ...entrada(ambientes, tareas, 'puestaAPunto') }
  expect(elegirAmbienteDeArranque(conModo, tareas)).toBe('a')
})

test('sin tareas disponibles no hay ambiente de arranque', () => {
  expect(elegirAmbienteDeArranque(entrada([ambiente('a')], []), [])).toBeNull()
})

test('el paso de arranque dura 2 minutos o menos', () => {
  const tareas = [
    tarea('corta', 'a', { duracionMin: 2, impactoVisual: 1 }),
    tarea('larga', 'a', { duracionMin: 20, impactoVisual: 3 }),
  ]
  const resultado = elegirPasoDeArranque(tareas, SIN_PENDIENTES, CTX, 'arrancarYa')
  expect(resultado?.tarea.id).toBe('corta')
  expect(resultado?.tarea.duracionMin).toBeLessThanOrEqual(2)
  expect(resultado?.advertencia).toBeNull()
})

test('entre varias de 2 minutos elige la de mayor puntaje', () => {
  const tareas = [
    tarea('discreta', 'a', { duracionMin: 2, impactoVisual: 1 }),
    tarea('llamativa', 'a', { duracionMin: 2, impactoVisual: 3 }),
  ]
  expect(elegirPasoDeArranque(tareas, SIN_PENDIENTES, CTX, 'arrancarYa')?.tarea.id).toBe('llamativa')
})

test('no elige un paso que todavía tiene dependencias pendientes', () => {
  const tareas = [
    tarea('bloqueada', 'a', { duracionMin: 2 }),
    tarea('previa', 'a', { duracionMin: 4 }),
    tarea('libre', 'a', { duracionMin: 3 }),
  ]
  const pendientes = new Map([['bloqueada', new Set(['previa'])]])
  const resultado = elegirPasoDeArranque(tareas, pendientes, CTX, 'arrancarYa')
  expect(resultado?.tarea.id).toBe('libre')
})

test('si la herramienta faltante borró el único paso de 2 minutos, usa el respaldo y avisa', () => {
  // El filtro por herramientas ocurre antes, en generarPlan: la tarea de 2
  // minutos pedía trapo y ya no está en la lista. Queda la más corta.
  const yaFiltradas = [tarea('media', 'a', { duracionMin: 5 })]
  const resultado = elegirPasoDeArranque(yaFiltradas, SIN_PENDIENTES, CTX, 'arrancarYa')
  expect(resultado?.tarea.id).toBe('media')
  expect(resultado?.advertencia).toMatch(/2 minutos/i)
})

test('sin ninguna tarea no hay paso de arranque', () => {
  expect(elegirPasoDeArranque([], SIN_PENDIENTES, CTX, 'arrancarYa')).toBeNull()
})

test('el resultado es determinístico', () => {
  const tareas = [tarea('a', 'a', { duracionMin: 2 }), tarea('b', 'a', { duracionMin: 2 })]
  const primero = elegirPasoDeArranque(tareas, SIN_PENDIENTES, CTX, 'arrancarYa')?.tarea.id
  for (let vuelta = 0; vuelta < 50; vuelta++) {
    expect(elegirPasoDeArranque(tareas, SIN_PENDIENTES, CTX, 'arrancarYa')?.tarea.id).toBe(primero)
  }
})
