import { expect, test } from 'vitest'
import { construirGrafo, resolverCiclos } from './grafo'
import type { Tarea } from '../tipos'

function tarea(id: string, extra: Partial<Tarea> = {}): Tarea {
  return {
    id,
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

/** Dos tareas que se requieren mutuamente, con duraciones distintas. */
function cicloDeDos() {
  return [
    tarea('a', { duracionMin: 3, requiere: ['b'] }),
    tarea('b', { duracionMin: 9, requiere: ['a'] }),
  ]
}

test('arma las dependencias solo entre las tareas del conjunto', () => {
  const { pendientesDe, advertencias } = construirGrafo([
    tarea('a'),
    tarea('b', { requiere: ['a', 'afuera'] }),
  ])
  expect([...pendientesDe.get('b')!]).toEqual(['a'])
  expect(advertencias).toEqual([])
})

test('una dependencia hacia afuera del conjunto se ignora, no se reporta', () => {
  const { pendientesDe, advertencias } = construirGrafo([tarea('sola', { requiere: ['no-esta'] })])
  expect([...pendientesDe.get('sola')!]).toEqual([])
  expect(advertencias).toEqual([])
})

test('un grafo sin ciclos no se toca', () => {
  const a = tarea('a', { duracionMin: 2 })
  const b = tarea('b', { requiere: ['a'] })
  expect(resolverCiclos([a, b]).aristasRotas).toEqual([])
  expect(construirGrafo([a, b]).advertencias).toEqual([])
})

test('rompe el ciclo por la tarea más larga y lo reporta', () => {
  const { aristasRotas } = resolverCiclos(cicloDeDos())
  expect(aristasRotas).toHaveLength(1)
  expect(aristasRotas[0]).toContain('b')
})

test('después de romper el ciclo no queda ninguna arista que lo cierre', () => {
  const { pendientesDe } = construirGrafo(cicloDeDos())
  expect([...pendientesDe.get('a')!]).toEqual(['b'])
  expect([...pendientesDe.get('b')!]).toEqual([])
})

test('la advertencia explica qué se rompió', () => {
  const { advertencias } = construirGrafo(cicloDeDos())
  expect(advertencias).toHaveLength(1)
  expect(advertencias[0]).toMatch(/ciclo/i)
  expect(advertencias[0]).toContain('b')
})

test('un ciclo de tres tareas también se rompe, con una sola arista', () => {
  const tareas = [
    tarea('a', { duracionMin: 1, requiere: ['c'] }),
    tarea('b', { duracionMin: 5, requiere: ['a'] }),
    tarea('c', { duracionMin: 9, requiere: ['b'] }),
  ]
  expect(resolverCiclos(tareas).aristasRotas).toHaveLength(1)
  expect(construirGrafo(tareas).advertencias).toHaveLength(1)
})

test('el resultado es determinístico', () => {
  const primero = resolverCiclos(cicloDeDos()).aristasRotas
  for (let vuelta = 0; vuelta < 50; vuelta++) {
    expect(resolverCiclos(cicloDeDos()).aristasRotas).toEqual(primero)
  }
})
