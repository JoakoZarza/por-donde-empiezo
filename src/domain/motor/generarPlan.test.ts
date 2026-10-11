import { expect, test } from 'vitest'
import { generarPlan } from './generarPlan'
import { CATALOGO } from '../catalogo'
import type { EntradaPlan, Modo } from '../tipos'

/*
  El motor ensamblado. Los tests corren contra el catálogo REAL y comprueban las
  seis garantías de la sección 5.3 de punta a punta: es la última red antes de que
  esto llegue a una pantalla.
*/

const AHORA = '2026-10-10T21:00:00.000Z'
const TODAS_LAS_HERRAMIENTAS = ['escoba', 'trapo', 'balde', 'detergente', 'aspiradora']
const MODOS: Modo[] = ['arrancarYa', 'ambientePorAmbiente', 'puestaAPunto']

function casaCompleta(modo: Modo, presupuestoMin: number | null = null): EntradaPlan {
  return {
    ambientes: CATALOGO.ambientes,
    tareas: CATALOGO.tareas,
    hechasEnCiclo: [],
    presupuestoMin,
    modo,
    herramientasDisponibles: TODAS_LAS_HERRAMIENTAS,
  }
}

const idsDelPlan = (entrada: EntradaPlan): string[] =>
  generarPlan(entrada, AHORA, 'plan-1').plan.pasos.map((paso) => paso.tareaId)

const tareaPorId = (id: string) => CATALOGO.tareas.find((tarea) => tarea.id === id)!
const minutosDe = (ids: string[]) => ids.reduce((total, id) => total + tareaPorId(id).duracionMin, 0)

test('el plan empieza por un paso de 2 minutos como máximo, en los tres modos', () => {
  // G2
  for (const modo of MODOS) {
    const primero = tareaPorId(idsDelPlan(casaCompleta(modo))[0])
    expect(primero.duracionMin, modo).toBeLessThanOrEqual(2)
    expect(primero.requiere, modo).toEqual([])
  }
})

test('ninguna tarea aparece antes que sus dependencias', () => {
  // G1
  for (const modo of MODOS) {
    const secuencia = idsDelPlan(casaCompleta(modo))
    const posicion = new Map(secuencia.map((id, indice) => [id, indice]))
    for (const tarea of CATALOGO.tareas) {
      if (!posicion.has(tarea.id)) continue
      for (const dependencia of tarea.requiere) {
        if (!posicion.has(dependencia)) continue
        expect(
          posicion.get(dependencia)!,
          `${modo}: ${dependencia} debe ir antes que ${tarea.id}`,
        ).toBeLessThan(posicion.get(tarea.id)!)
      }
    }
  }
})

test('nunca se pasa del presupuesto elegido', () => {
  // G4
  for (const presupuesto of [5, 10, 20, 60]) {
    const { plan, meta } = generarPlan(casaCompleta('arrancarYa', presupuesto), AHORA, 'plan-1')
    const minutos = minutosDe(plan.pasos.map((paso) => paso.tareaId))
    expect(minutos, `presupuesto ${presupuesto}`).toBeLessThanOrEqual(presupuesto)
    expect(meta.minutos).toBe(minutos)
    expect(meta.pasos).toBe(plan.pasos.length)
  }
})

test('la misma entrada produce exactamente el mismo plan cien veces', () => {
  // G5
  const primero = idsDelPlan(casaCompleta('arrancarYa'))
  expect(primero.length).toBeGreaterThan(0)
  for (let vuelta = 0; vuelta < 100; vuelta++) {
    expect(idsDelPlan(casaCompleta('arrancarYa'))).toEqual(primero)
  }
})

test('cada tarea aparece una sola vez en el plan', () => {
  const secuencia = idsDelPlan(casaCompleta('puestaAPunto'))
  expect(new Set(secuencia).size).toBe(secuencia.length)
})

test('las tareas ya hechas en el ciclo no vuelven a aparecer', () => {
  const entrada = { ...casaCompleta('arrancarYa'), hechasEnCiclo: ['cocina-barrer'] }
  expect(idsDelPlan(entrada)).not.toContain('cocina-barrer')
})

test('las tareas que piden herramientas que no tengo no aparecen', () => {
  const entrada = { ...casaCompleta('arrancarYa'), herramientasDisponibles: ['escoba'] }
  const secuencia = idsDelPlan(entrada)
  expect(secuencia.length).toBeGreaterThan(0)
  for (const id of secuencia) {
    for (const herramienta of tareaPorId(id).herramientas) {
      expect(herramienta, `${id} pide ${herramienta}, que no tengo`).toBe('escoba')
    }
  }
})

test('sin tareas disponibles devuelve un plan vacío con advertencia, no una excepción', () => {
  // Caso 2 de Review Focus
  const { plan, meta } = generarPlan({ ...casaCompleta('arrancarYa'), tareas: [] }, AHORA, 'plan-1')
  expect(plan.pasos).toEqual([])
  expect(meta.pasos).toBe(0)
  expect(meta.minutos).toBe(0)
  expect(plan.advertencias.length).toBeGreaterThan(0)
})

test('con un presupuesto imposible lo dice en vez de devolver un plan vacío en silencio', () => {
  // Caso 1 de Review Focus y garantía G6
  const { plan, meta } = generarPlan(casaCompleta('arrancarYa', 1), AHORA, 'plan-1')
  expect(meta.pasos).toBe(0)
  expect(plan.advertencias.join(' ')).toMatch(/minutos/i)
})

test('los tres modos producen órdenes distintos sobre la misma casa', () => {
  const [arrancarYa, ambientePorAmbiente, puestaAPunto] = MODOS.map((modo) => idsDelPlan(casaCompleta(modo)))
  expect(arrancarYa).not.toEqual(ambientePorAmbiente)
  expect(ambientePorAmbiente).not.toEqual(puestaAPunto)
  expect(arrancarYa).not.toEqual(puestaAPunto)
})

test('el plan guarda el presupuesto en segundos, y la identidad que le dieron', () => {
  const { plan } = generarPlan(casaCompleta('arrancarYa', 20), AHORA, 'plan-1')
  expect(plan.presupuestoSegundos).toBe(1200)
  expect(plan.creadoEn).toBe(AHORA)
  expect(plan.id).toBe('plan-1')
  expect(plan.cerradoEn).toBeNull()
  expect(plan.modo).toBe('arrancarYa')
})

test('sin límite el presupuesto guardado es nulo', () => {
  expect(generarPlan(casaCompleta('arrancarYa', null), AHORA, 'plan-1').plan.presupuestoSegundos).toBeNull()
})

test('todos los pasos nacen pendientes y sin fecha', () => {
  for (const paso of generarPlan(casaCompleta('arrancarYa'), AHORA, 'plan-1').plan.pasos) {
    expect(paso.estado).toBe('pendiente')
    expect(paso.hechoEn).toBeNull()
  }
})

test('el motor no consulta el reloj: con el mismo `ahora` el plan es idéntico', () => {
  const uno = generarPlan(casaCompleta('arrancarYa'), AHORA, 'plan-1').plan
  const dos = generarPlan(casaCompleta('arrancarYa'), AHORA, 'plan-1').plan
  expect(uno).toEqual(dos)
})
