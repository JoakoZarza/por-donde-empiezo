import { expect, test } from 'vitest'
import { recortarAlPresupuesto } from './presupuesto'
import { construirGrafo } from './grafo'
import { CATALOGO } from '../catalogo'
import type { Tarea } from '../tipos'

/*
  El recorte al tiempo disponible. Cubre G4 (nunca se pasa del presupuesto) y
  G6 (si no entra nada útil, lo dice en vez de devolver una lista vacía).

  El invariante central: lo conservado más lo que falta es el total. Si algún
  minuto se pierde en el camino, ese test lo grita.
*/

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

const sumaMinutos = (tareas: Tarea[]) => tareas.reduce((total, t) => total + t.duracionMin, 0)

test('sin presupuesto conserva todo y no falta nada', () => {
  const orden = CATALOGO.tareas
  const { conservadas, minutosFaltantes, advertencias } = recortarAlPresupuesto(
    orden,
    construirGrafo(orden).pendientesDe,
    null,
  )
  expect(conservadas).toEqual(orden)
  expect(minutosFaltantes).toBe(0)
  expect(advertencias).toEqual([])
})

test('nunca se pasa del presupuesto', () => {
  const orden = CATALOGO.tareas
  const pendientesDe = construirGrafo(orden).pendientesDe
  for (const presupuesto of [5, 10, 20, 60]) {
    const { conservadas } = recortarAlPresupuesto(orden, pendientesDe, presupuesto)
    expect(sumaMinutos(conservadas), `presupuesto ${presupuesto}`).toBeLessThanOrEqual(presupuesto)
  }
})

test('lo conservado más lo que falta es el total, sin perder minutos', () => {
  const orden = CATALOGO.tareas
  const pendientesDe = construirGrafo(orden).pendientesDe
  for (const presupuesto of [0, 5, 20, 60]) {
    const { conservadas, minutosFaltantes } = recortarAlPresupuesto(orden, pendientesDe, presupuesto)
    expect(sumaMinutos(conservadas) + minutosFaltantes, `presupuesto ${presupuesto}`).toBe(sumaMinutos(orden))
  }
})

test('conserva el orden original: es una subsecuencia', () => {
  const orden = CATALOGO.tareas
  const { conservadas } = recortarAlPresupuesto(orden, construirGrafo(orden).pendientesDe, 30)
  const idsConservados = conservadas.map((t) => t.id)
  const idsEsperados = orden.map((t) => t.id).filter((id) => idsConservados.includes(id))
  expect(idsConservados).toEqual(idsEsperados)
})

test('si una tarea no entra, sus dependientes tampoco, aunque entren solas', () => {
  const barrer = tarea('barrer', { duracionMin: 30 })
  const trapear = tarea('trapear', { duracionMin: 5, requiere: ['barrer'] })
  const { conservadas, minutosFaltantes } = recortarAlPresupuesto(
    [barrer, trapear],
    construirGrafo([barrer, trapear]).pendientesDe,
    10,
  )
  expect(conservadas.map((t) => t.id)).toEqual([])
  expect(minutosFaltantes).toBe(35)
})

test('con presupuesto insuficiente lo dice en vez de devolver nada en silencio', () => {
  // Caso 1 de Review Focus y garantía G6.
  const sola = [tarea('larga', { duracionMin: 20 })]
  const { conservadas, advertencias, minutosFaltantes } = recortarAlPresupuesto(
    sola,
    construirGrafo(sola).pendientesDe,
    10,
  )
  expect(conservadas).toEqual([])
  expect(minutosFaltantes).toBe(20)
  expect(advertencias).toHaveLength(1)
  expect(advertencias[0]).toMatch(/20 minutos/)
})

test('presupuesto cero o negativo no rompe nada', () => {
  const sola = [tarea('larga', { duracionMin: 20 })]
  for (const presupuesto of [0, -5]) {
    const { conservadas, advertencias } = recortarAlPresupuesto(
      sola,
      construirGrafo(sola).pendientesDe,
      presupuesto,
    )
    expect(conservadas).toEqual([])
    expect(advertencias.length).toBeGreaterThan(0)
  }
})

test('cuando sobra tiempo igual avisa que quedaron cosas afuera', () => {
  const orden = CATALOGO.tareas
  const { advertencias, minutosFaltantes } = recortarAlPresupuesto(
    orden,
    construirGrafo(orden).pendientesDe,
    30,
  )
  expect(minutosFaltantes).toBeGreaterThan(0)
  expect(advertencias.some((a) => /afuera/.test(a))).toBe(true)
})

test('sin tareas no hay nada que recortar ni que avisar', () => {
  expect(recortarAlPresupuesto([], new Map(), 10)).toEqual({
    conservadas: [],
    minutosFaltantes: 0,
    advertencias: [],
  })
})
