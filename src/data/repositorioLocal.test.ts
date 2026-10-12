import 'fake-indexeddb/auto'
import { expect, test } from 'vitest'
import { crearRepositorioLocal } from './repositorioLocal'
import type { Ambiente, Plan, Tarea } from '../domain/tipos'

/*
  El repositorio es la única puerta a la persistencia. Hoy hay una sola
  implementación —el teléfono, con IndexedDB— y en el entregable 5 se le suma la
  nube detrás de esta misma interfaz. Por eso los tests hablan de comportamiento
  y no de IndexedDB.

  Cada test usa una base con nombre propio: si compartieran una, el orden de
  ejecución cambiaría los resultados.
*/

let contadorDeBases = 0
function repositorio() {
  contadorDeBases += 1
  return crearRepositorioLocal(`prueba-${contadorDeBases}`)
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
    esDelCatalogo: false,
    notas: null,
    ...extra,
  }
}

function plan(id: string, creadoEn: string): Plan {
  return {
    id,
    creadoEn,
    modo: 'arrancarYa',
    presupuestoSegundos: 1200,
    pasos: [{ tareaId: 't1', estado: 'pendiente', hechoEn: null }],
    cerradoEn: null,
    minutosFaltantes: 0,
    advertencias: [],
  }
}

test('guarda y recupera un ambiente, tal como se guardó', async () => {
  const repo = repositorio()
  const cocina = ambiente('cocina', { nombre: 'Cocina', ordenRecorrido: 3 })
  await repo.guardarAmbiente(cocina)
  expect(await repo.listarAmbientes()).toEqual([cocina])
})

test('lista los ambientes en orden de recorrido, no en orden de guardado', async () => {
  const repo = repositorio()
  await repo.guardarAmbiente(ambiente('cocina', { ordenRecorrido: 3 }))
  await repo.guardarAmbiente(ambiente('dormitorio', { ordenRecorrido: 1 }))
  await repo.guardarAmbiente(ambiente('living', { ordenRecorrido: 2 }))
  expect((await repo.listarAmbientes()).map((a) => a.id)).toEqual(['dormitorio', 'living', 'cocina'])
})

test('guarda y recupera una tarea, y la lista solo en su ambiente', async () => {
  const repo = repositorio()
  const enCocina = tarea('cocina-barrer', { ambienteId: 'cocina' })
  const enBano = tarea('bano-barrer', { ambienteId: 'bano' })
  await repo.guardarTarea(enCocina)
  await repo.guardarTarea(enBano)

  expect(await repo.listarTareas('cocina')).toEqual([enCocina])
  expect(await repo.listarTareas('bano')).toEqual([enBano])
  expect(await repo.listarTareas('garage')).toEqual([])
})

test('no guarda una tarea sin acción, ni con solo espacios', async () => {
  // Caso 3 de Review Focus: el nombre que escribe la persona no puede quedar vacío.
  const repo = repositorio()
  await expect(repo.guardarTarea(tarea('sin-accion', { accion: '' }))).rejects.toThrow()
  await expect(repo.guardarTarea(tarea('espacios', { accion: '   ' }))).rejects.toThrow()
  expect(await repo.listarTareas('cocina')).toEqual([])
})

test('una tarea propia sin descripción sí se guarda: la acción alcanza', async () => {
  // Alguien escribe «regar las plantas» y no hay verbo y objeto separados.
  const repo = repositorio()
  const propia = tarea('propia', { accion: 'Regar las plantas', descripcion: '' })
  await repo.guardarTarea(propia)
  expect(await repo.listarTareas('cocina')).toEqual([propia])
})

test('elimina un ambiente y una tarea', async () => {
  const repo = repositorio()
  await repo.guardarAmbiente(ambiente('cocina'))
  await repo.guardarAmbiente(ambiente('bano', { ordenRecorrido: 2 }))
  await repo.guardarTarea(tarea('cocina-barrer'))

  await repo.eliminarAmbiente('cocina')
  await repo.eliminarTarea('cocina-barrer')

  expect((await repo.listarAmbientes()).map((a) => a.id)).toEqual(['bano'])
  expect(await repo.listarTareas('cocina')).toEqual([])
})

test('marca una tarea como hecha y la lista entre las hechas de su ambiente', async () => {
  const repo = repositorio()
  await repo.guardarTarea(tarea('cocina-barrer', { ambienteId: 'cocina' }))
  await repo.marcarHecha('cocina-barrer', '2026-10-10T21:00:00.000Z')

  expect(await repo.listarHechas('cocina')).toEqual(['cocina-barrer'])
  expect(await repo.listarHechas('bano')).toEqual([])
})

test('no se puede marcar como hecha una tarea que no existe', async () => {
  const repo = repositorio()
  await expect(repo.marcarHecha('fantasma', '2026-10-10T21:00:00.000Z')).rejects.toThrow()
})

test('guarda el plan y lo devuelve como último plan', async () => {
  const repo = repositorio()
  const uno = plan('plan-1', '2026-10-10T21:00:00.000Z')
  await repo.guardarPlan(uno)
  expect(await repo.obtenerPlan('plan-1')).toEqual(uno)
  expect(await repo.ultimoPlan()).toEqual(uno)
})

test('el último plan es el más reciente, no el último guardado', async () => {
  const repo = repositorio()
  await repo.guardarPlan(plan('viejo', '2026-09-01T10:00:00.000Z'))
  await repo.guardarPlan(plan('nuevo', '2026-10-10T21:00:00.000Z'))
  expect((await repo.ultimoPlan())?.id).toBe('nuevo')
})

test('sin planes, el último plan es nulo y un plan inexistente también', async () => {
  const repo = repositorio()
  expect(await repo.ultimoPlan()).toBeNull()
  expect(await repo.obtenerPlan('no-existe')).toBeNull()
})

test('las preferencias arrancan con valores sensatos', async () => {
  const repo = repositorio()
  const preferencias = await repo.preferencias()
  expect(preferencias.modoPorDefecto).toBe('arrancarYa')
  expect(preferencias.herramientasDisponibles).toContain('escoba')
  expect(preferencias.duracionRetoPreferida).toBeGreaterThan(0)
})

test('guarda y recupera las preferencias', async () => {
  const repo = repositorio()
  await repo.guardarPreferencias({
    herramientasDisponibles: ['escoba'],
    modoPorDefecto: 'puestaAPunto',
    duracionRetoPreferida: 15,
    playlistPropia: null,
    claveDeIa: null,
    avisoDePrivacidadAceptado: false,
    estiloDeReloj: 'carrera',
  })
  const preferencias = await repo.preferencias()
  expect(preferencias.herramientasDisponibles).toEqual(['escoba'])
  expect(preferencias.modoPorDefecto).toBe('puestaAPunto')
  expect(preferencias.duracionRetoPreferida).toBe(15)
})

test('borrarTodo deja el repositorio vacío', async () => {
  const repo = repositorio()
  await repo.guardarAmbiente(ambiente('cocina'))
  await repo.guardarTarea(tarea('cocina-barrer'))
  await repo.marcarHecha('cocina-barrer', '2026-10-10T21:00:00.000Z')
  await repo.guardarPlan(plan('plan-1', '2026-10-10T21:00:00.000Z'))
  await repo.guardarPreferencias({
    herramientasDisponibles: ['escoba'],
    modoPorDefecto: 'puestaAPunto',
    duracionRetoPreferida: 15,
    playlistPropia: null,
    claveDeIa: null,
    avisoDePrivacidadAceptado: false,
    estiloDeReloj: 'carrera',
  })

  await repo.borrarTodo()

  expect(await repo.listarAmbientes()).toEqual([])
  expect(await repo.listarTareas('cocina')).toEqual([])
  expect(await repo.listarHechas('cocina')).toEqual([])
  expect(await repo.ultimoPlan()).toBeNull()
  expect((await repo.preferencias()).modoPorDefecto).toBe('arrancarYa')
})
