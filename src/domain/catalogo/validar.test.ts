import { expect, test } from 'vitest'
import { validarCatalogo } from './validar'
import type { Ambiente, Objeto, Tarea } from '../tipos'

/*
  El validador es la red de seguridad del catálogo. Las obligaciones de
  integridad de la sección 5.4 de la especificación se comprueban acá, sobre los
  datos, y no confiando en que quien escribió el catálogo lo hizo bien.

  Los tests que afirman una CANTIDAD exacta de problemas parten siempre de un
  catálogo válido y rompen una sola cosa. Si partieran de un catálogo que viola
  varias reglas a la vez, el conteo no probaría nada sobre la regla que se quiere
  probar.
*/

function ambiente(id: string, extra: Partial<Ambiente> = {}): Ambiente {
  return {
    id,
    hogarId: 'catalogo',
    tipo: 'cocina',
    nombre: id,
    ordenRecorrido: 1,
    ultimaPuestaAlDia: null,
    vecesAlDia: 0,
    ...extra,
  }
}

function tarea(id: string, extra: Partial<Tarea> = {}): Tarea {
  return {
    id,
    ambienteId: 'cocina',
    subAmbienteId: null,
    objetoId: null,
    verbo: 'limpiar',
    descripcion: id,
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

/** Un catálogo mínimo válido: un ambiente, un arranque de 2 minutos y su dependiente húmedo. */
function catalogoValido() {
  const ambientes = [ambiente('cocina', { ordenRecorrido: 1 })]
  const objetos: Objeto[] = [{ id: 'piso', ambienteId: 'cocina', subAmbienteId: null, nombre: 'Piso' }]
  const tareas = [
    tarea('barrer', { objetoId: 'piso', descripcion: 'barrer el piso', duracionMin: 2 }),
    tarea('trapear', { objetoId: 'piso', descripcion: 'trapear el piso', requiere: ['barrer'] }),
  ]
  return { ambientes, tareas, objetos }
}

test('un catálogo correcto no reporta problemas', () => {
  const { ambientes, tareas, objetos } = catalogoValido()
  expect(validarCatalogo(ambientes, tareas, objetos)).toEqual([])
})

test('reporta una dependencia que apunta a una tarea inexistente', () => {
  const { ambientes, tareas, objetos } = catalogoValido()
  const conRota = tareas.map((t) =>
    t.id === 'trapear' ? { ...t, requiere: ['barrer', 'no-existe'] } : t,
  )
  const problemas = validarCatalogo(ambientes, conRota, objetos)
  expect(problemas).toHaveLength(1)
  expect(problemas[0]).toContain('no-existe')
})

test('reporta un ciclo de dependencias', () => {
  const { ambientes, objetos } = catalogoValido()
  const tareas = [
    tarea('barrer', { duracionMin: 2, requiere: ['trapear'] }),
    tarea('trapear', { requiere: ['barrer'] }),
  ]
  const problemas = validarCatalogo(ambientes, tareas, objetos)
  expect(problemas.some((p) => /ciclo de dependencias/i.test(p))).toBe(true)
})

test('reporta duración cero, verbo inválido, esfuerzo e impacto fuera de rango', () => {
  const { ambientes, tareas, objetos } = catalogoValido()
  const rotas = [
    ...tareas,
    tarea('a', { duracionMin: 0 }),
    tarea('b', { verbo: 'planchar' as unknown as Tarea['verbo'] }),
    tarea('c', { esfuerzo: 7 as unknown as Tarea['esfuerzo'] }),
    tarea('d', { impactoVisual: 0 as unknown as Tarea['impactoVisual'] }),
  ]
  const problemas = validarCatalogo(ambientes, rotas, objetos)
  expect(problemas).toHaveLength(4)
  for (const id of ['a', 'b', 'c', 'd']) {
    expect(
      problemas.some((p) => p.startsWith(`tarea ${id}:`)),
      `falta el problema de la tarea ${id}`,
    ).toBe(true)
  }
})

test('reporta un ambiente sin ninguna tarea de 2 minutos sin dependencias', () => {
  const ambientes = [ambiente('cocina'), ambiente('bano', { ordenRecorrido: 2 })]
  const tareas = [
    tarea('corta', { duracionMin: 2 }),
    tarea('larga', { ambienteId: 'bano', duracionMin: 20 }),
  ]
  const problemas = validarCatalogo(ambientes, tareas, [])
  expect(problemas.some((p) => p.includes('bano') && /2 minutos/.test(p))).toBe(true)
})

test('reporta un trapear que no depende de un barrer del mismo ambiente', () => {
  const { ambientes, objetos } = catalogoValido()
  const tareas = [
    tarea('barrer', { descripcion: 'barrer el piso', duracionMin: 2 }),
    tarea('trapear', { descripcion: 'trapear el piso', requiere: [] }),
  ]
  const problemas = validarCatalogo(ambientes, tareas, objetos)
  expect(problemas.some((p) => /seco antes que húmedo/i.test(p))).toBe(true)
})

test('reporta dos ambientes con el mismo orden de recorrido', () => {
  const ambientes = [
    ambiente('cocina', { ordenRecorrido: 3 }),
    ambiente('bano', { ordenRecorrido: 3 }),
  ]
  const tareas = [
    tarea('corta', { duracionMin: 2 }),
    tarea('bano-corta', { ambienteId: 'bano', duracionMin: 2 }),
  ]
  const problemas = validarCatalogo(ambientes, tareas, [])
  expect(problemas.some((p) => /ordenRecorrido/i.test(p))).toBe(true)
})

test('reporta una tarea que apunta a un objeto inexistente', () => {
  const { ambientes, objetos } = catalogoValido()
  const tareas = [tarea('barrer', { duracionMin: 2, objetoId: 'no-existe' })]
  const problemas = validarCatalogo(ambientes, tareas, objetos)
  expect(problemas.some((p) => p.includes('no-existe'))).toBe(true)
})
