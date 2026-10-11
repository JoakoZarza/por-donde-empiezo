import { expect, test } from 'vitest'
import { ambienteCocina, objetosCocina, tareasCocina } from './cocina'
import { validarCatalogo } from './validar'

/*
  El catálogo de la cocina es el ambiente de referencia: es el que la idea
  original describió con más detalle, y el patrón que después copian los otros
  siete ambientes.
*/

test('el catálogo de la cocina es íntegro', () => {
  expect(validarCatalogo([ambienteCocina], tareasCocina, objetosCocina)).toEqual([])
})

test('la cocina tiene al menos una tarea de 2 minutos sin dependencias', () => {
  const arranques = tareasCocina.filter((tarea) => tarea.duracionMin <= 2 && tarea.requiere.length === 0)
  expect(arranques.length).toBeGreaterThanOrEqual(1)
})

test('trapear el piso depende de barrer el piso', () => {
  const barrer = tareasCocina.find((tarea) => /barr/i.test(tarea.accion))
  const trapear = tareasCocina.find((tarea) => /trap/i.test(tarea.accion))
  expect(barrer, 'falta la tarea de barrer').toBeDefined()
  expect(trapear, 'falta la tarea de trapear').toBeDefined()
  expect(trapear?.requiere).toContain(barrer?.id)
})

test('están las doce tareas que la especificación nombró', () => {
  const esperadas = [
    'cocina-alacena',
    'cocina-barrer',
    'cocina-guardar-platos',
    'cocina-heladera',
    'cocina-heladera-limpia',
    'cocina-hornallas',
    'cocina-lavar-platos',
    'cocina-mesa',
    'cocina-mesada',
    'cocina-mesada-despejar',
    'cocina-tirar-basura',
    'cocina-trapear',
  ].sort()
  expect(tareasCocina.map((tarea) => tarea.id).sort()).toEqual(esperadas)
})

test('cada tarea está completa y apunta a un objeto del ambiente', () => {
  const idsObjetos = new Set(objetosCocina.map((objeto) => objeto.id))
  for (const tarea of tareasCocina) {
    expect(tarea.ambienteId, `${tarea.id}`).toBe(ambienteCocina.id)
    expect(tarea.duracionMin, `${tarea.id}`).toBeGreaterThan(0)
    expect(tarea.esDelCatalogo, `${tarea.id}`).toBe(true)
    expect(tarea.objetoId, `${tarea.id} no declara objeto`).not.toBeNull()
    expect(idsObjetos.has(tarea.objetoId ?? ''), `${tarea.id} apunta a un objeto que no existe`).toBe(true)
  }
})

test('«arriba antes que abajo» queda codificado en las dependencias', () => {
  // El validador no puede comprobar esta regla, pero el catálogo sí la expresa:
  // el piso se barre después de despejar la mesada, no antes.
  const barrer = tareasCocina.find((tarea) => tarea.id === 'cocina-barrer')
  const despejar = tareasCocina.find((tarea) => tarea.id === 'cocina-mesada-despejar')
  expect(barrer?.requiere).toContain(despejar?.id)
})
