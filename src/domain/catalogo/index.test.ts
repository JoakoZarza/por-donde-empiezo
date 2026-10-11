import { expect, test } from 'vitest'
import { CATALOGO, ambientePorId, objetoPorId, objetosDeAmbiente, tareasDeAmbiente } from './index'
import { validarCatalogo } from './validar'
import { TIPOS_AMBIENTE } from '../tipos'

/*
  El catálogo completo. Estos tests son la garantía de que los ocho ambientes se
  comportan igual: el validador comprueba la integridad, y los tests de acá
  comprueban las promesas que el motor va a dar por sentadas.
*/

test('el catálogo completo es íntegro', () => {
  expect(validarCatalogo(CATALOGO.ambientes, CATALOGO.tareas, CATALOGO.objetos)).toEqual([])
})

test('están los ocho ambientes, uno por tipo, con orden de recorrido único', () => {
  expect(CATALOGO.ambientes).toHaveLength(8)
  expect(new Set(CATALOGO.ambientes.map((a) => a.tipo))).toEqual(new Set(TIPOS_AMBIENTE))
  expect(new Set(CATALOGO.ambientes.map((a) => a.ordenRecorrido)).size).toBe(8)
})

test('todos los ambientes tienen un arranque de 2 minutos sin dependencias', () => {
  for (const ambiente of CATALOGO.ambientes) {
    const arranques = tareasDeAmbiente(ambiente.id).filter(
      (tarea) => tarea.duracionMin <= 2 && tarea.requiere.length === 0,
    )
    expect(arranques.length, `el ambiente ${ambiente.tipo} no tiene arranque de 2 minutos`).toBeGreaterThanOrEqual(1)
  }
})

test('cada ambiente tiene al menos cinco tareas', () => {
  for (const ambiente of CATALOGO.ambientes) {
    expect(tareasDeAmbiente(ambiente.id).length, `el ambiente ${ambiente.tipo} tiene muy pocas tareas`).toBeGreaterThanOrEqual(5)
  }
})

test('cada ambiente tiene al menos dos objetos con nombre', () => {
  for (const ambiente of CATALOGO.ambientes) {
    const objetos = objetosDeAmbiente(ambiente.id)
    expect(objetos.length, `el ambiente ${ambiente.tipo} tiene muy pocos objetos`).toBeGreaterThanOrEqual(2)
    for (const objeto of objetos) {
      expect(objeto.nombre.trim(), `${objeto.id} no tiene nombre`).not.toBe('')
    }
  }
})

test('toda dependencia apunta a una tarea del mismo ambiente', () => {
  for (const tarea of CATALOGO.tareas) {
    for (const dependencia of tarea.requiere) {
      const otra = CATALOGO.tareas.find((candidata) => candidata.id === dependencia)
      expect(otra, `${tarea.id} depende de ${dependencia}, que no existe`).toBeDefined()
      expect(otra?.ambienteId, `${dependencia} está en otro ambiente que ${tarea.id}`).toBe(tarea.ambienteId)
    }
  }
})

test('en todos los ambientes con piso, se barre antes de trapear', () => {
  for (const ambiente of CATALOGO.ambientes) {
    const tareas = tareasDeAmbiente(ambiente.id)
    const barrer = tareas.find((tarea) => /barr/i.test(tarea.accion))
    const trapear = tareas.find((tarea) => /trap/i.test(tarea.accion))
    if (!barrer || !trapear) continue
    expect(trapear.requiere, `${ambiente.tipo}: trapear no depende de barrer`).toContain(barrer.id)
  }
})

test('los ids no se repiten entre ambientes, objetos y tareas', () => {
  const ids = [...CATALOGO.ambientes, ...CATALOGO.objetos, ...CATALOGO.tareas].map((entidad) => entidad.id)
  expect(new Set(ids).size).toBe(ids.length)
})

test('ambientePorId y objetoPorId devuelven la entidad o undefined', () => {
  expect(ambientePorId('cocina')?.tipo).toBe('cocina')
  expect(ambientePorId('no-existe')).toBeUndefined()
  expect(objetoPorId('cocina-obj-piso')?.nombre).toBe('Piso')
  expect(objetoPorId('no-existe')).toBeUndefined()
})
