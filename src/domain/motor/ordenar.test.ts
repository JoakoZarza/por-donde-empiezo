import { expect, test } from 'vitest'
import { ordenarResto } from './ordenar'
import type { OpcionesOrden } from './ordenar'
import { construirGrafo } from './grafo'
import { CATALOGO } from '../catalogo'
import type { Ambiente, Modo, Tarea } from '../tipos'

/*
  Ordenar el resto del plan. Acá viven tres garantías: G1 (nada antes de sus
  dependencias), G3 (nunca se trapea antes de barrer) y G5 (determinismo).

  Los tests corren sobre el catálogo REAL, no sobre datos de prueba: es la única
  forma de saber que las garantías valen sobre el contenido que la gente va a usar.
*/

function opcionesDelCatalogo(modo: Modo, ambienteDeArranque: string | null = null): OpcionesOrden {
  const tareas = CATALOGO.tareas
  return {
    tareas,
    ambientes: CATALOGO.ambientes,
    pendientesDe: construirGrafo(tareas).pendientesDe,
    modo,
    ambienteDeArranque,
    herramientasEnMano: ['escoba', 'trapo', 'balde', 'detergente'],
  }
}

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

const MODOS: Modo[] = ['arrancarYa', 'ambientePorAmbiente', 'puestaAPunto']

test('devuelve todas las tareas, sin repetir ninguna', () => {
  const orden = ordenarResto(opcionesDelCatalogo('arrancarYa'))
  expect(orden).toHaveLength(CATALOGO.tareas.length)
  expect(new Set(orden.map((t) => t.id)).size).toBe(orden.length)
})

test('ninguna tarea aparece antes que sus dependencias, en ningún modo', () => {
  for (const modo of MODOS) {
    const orden = ordenarResto(opcionesDelCatalogo(modo))
    const posicion = new Map(orden.map((t, indice) => [t.id, indice]))
    for (const actual of CATALOGO.tareas) {
      for (const dependencia of actual.requiere) {
        expect(
          posicion.get(dependencia)!,
          `${modo}: ${dependencia} debe ir antes que ${actual.id}`,
        ).toBeLessThan(posicion.get(actual.id)!)
      }
    }
  }
})

test('nunca se trapea antes de barrer, en ningún modo', () => {
  const barrer = CATALOGO.tareas.find((t) => t.id === 'cocina-barrer')!
  const trapear = CATALOGO.tareas.find((t) => t.id === 'cocina-trapear')!
  for (const modo of MODOS) {
    const posicion = new Map(ordenarResto(opcionesDelCatalogo(modo)).map((t, indice) => [t.id, indice]))
    expect(posicion.get(barrer.id)!, modo).toBeLessThan(posicion.get(trapear.id)!)
  }
})

test('la misma entrada produce el mismo orden cien veces', () => {
  const calcular = () => ordenarResto(opcionesDelCatalogo('arrancarYa')).map((t) => t.id)
  const primero = calcular()
  for (let vuelta = 0; vuelta < 100; vuelta++) {
    expect(calcular()).toEqual(primero)
  }
})

test('en puestaAPunto los ambientes salen en orden de recorrido y nunca se vuelve atrás', () => {
  const recorrido = new Map(CATALOGO.ambientes.map((a) => [a.id, a.ordenRecorrido]))
  const secuencia = ordenarResto(opcionesDelCatalogo('puestaAPunto')).map((t) => recorrido.get(t.ambienteId) ?? 0)
  let maximoVisto = 0
  for (const valor of secuencia) {
    expect(valor).toBeGreaterThanOrEqual(maximoVisto)
    maximoVisto = Math.max(maximoVisto, valor)
  }
})

test('ante un empate total desempata por ambienteId ascendente', () => {
  const tareas = [
    tarea('z', 'b', { duracionMin: 5, impactoVisual: 1 }),
    tarea('a', 'a', { duracionMin: 5, impactoVisual: 1 }),
  ]
  const orden = ordenarResto({
    tareas,
    ambientes: [ambiente('a'), ambiente('b', { ordenRecorrido: 2 })],
    pendientesDe: construirGrafo(tareas).pendientesDe,
    modo: 'arrancarYa',
    ambienteDeArranque: null,
    herramientasEnMano: [],
  })
  expect(orden.map((t) => t.id)).toEqual(['a', 'z'])
})

test('con una sola tarea devuelve esa tarea', () => {
  const tareas = [tarea('unica', 'a', { duracionMin: 2 })]
  const orden = ordenarResto({
    tareas,
    ambientes: [ambiente('a')],
    pendientesDe: construirGrafo(tareas).pendientesDe,
    modo: 'arrancarYa',
    ambienteDeArranque: 'a',
    herramientasEnMano: [],
  })
  expect(orden.map((t) => t.id)).toEqual(['unica'])
})
