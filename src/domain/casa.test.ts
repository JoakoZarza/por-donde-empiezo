import { expect, test } from 'vitest'
import { armarLaCasa } from './casa'
import { ambientePorId, tareasDeAmbiente } from './catalogo'

/*
  El plano de la casa.

  Fixtures reales del catálogo, no inventadas: si mañana se agrega un ambiente o se
  cambia su orden de recorrido, estos tests lo notan.
*/

const COCINA = ambientePorId('cocina')!
const BANO = ambientePorId('bano')!
const TAREAS_COCINA = tareasDeAmbiente('cocina')

test('un ambiente que la persona no eligió se ve apagado', () => {
  const [cuarto] = armarLaCasa({
    catalogo: [COCINA],
    elegidos: [],
    tareasPorAmbiente: {},
    hechasPorAmbiente: {},
  })

  expect(cuarto?.estado).toBe('sinElegir')
  expect(cuarto?.luz).toBe(0)
})

test('elegido y sin empezar también está apagado, pero es otro estado', () => {
  const [cuarto] = armarLaCasa({
    catalogo: [COCINA],
    elegidos: [COCINA],
    tareasPorAmbiente: { cocina: TAREAS_COCINA },
    hechasPorAmbiente: { cocina: [] },
  })

  expect(cuarto?.estado).toBe('sinEmpezar')
  expect(cuarto?.luz).toBe(0)
  expect(cuarto?.total).toBe(TAREAS_COCINA.length)
})

test('a medias se ilumina en proporción a lo hecho, y lo dice con números', () => {
  const hechas = TAREAS_COCINA.slice(0, 3).map((tarea) => tarea.id)
  const [cuarto] = armarLaCasa({
    catalogo: [COCINA],
    elegidos: [COCINA],
    tareasPorAmbiente: { cocina: TAREAS_COCINA },
    hechasPorAmbiente: { cocina: hechas },
  })

  expect(cuarto?.estado).toBe('aMedias')
  expect(cuarto?.hechas).toBe(3)
  expect(cuarto?.total).toBe(TAREAS_COCINA.length)
  expect(cuarto?.luz).toBeCloseTo(3 / TAREAS_COCINA.length)
})

test('al día se ilumina del todo', () => {
  const todas = TAREAS_COCINA.map((tarea) => tarea.id)
  const [cuarto] = armarLaCasa({
    catalogo: [COCINA],
    elegidos: [COCINA],
    tareasPorAmbiente: { cocina: TAREAS_COCINA },
    hechasPorAmbiente: { cocina: todas },
  })

  expect(cuarto?.estado).toBe('alDia')
  expect(cuarto?.luz).toBe(1)
})

test('un ambiente elegido sin ninguna tarea no queda «al día»', () => {
  // «Al día» con cero tareas sería mentira: no hay nada hecho, hay nada que hacer.
  const [cuarto] = armarLaCasa({
    catalogo: [COCINA],
    elegidos: [COCINA],
    tareasPorAmbiente: { cocina: [] },
    hechasPorAmbiente: { cocina: [] },
  })

  expect(cuarto?.estado).toBe('sinEmpezar')
})

test('el plano va en orden de recorrido, no en el orden en que se pasaron los ambientes', () => {
  const cuartos = armarLaCasa({
    catalogo: [BANO, COCINA],
    elegidos: [],
    tareasPorAmbiente: {},
    hechasPorAmbiente: {},
  })

  const orden = cuartos.map((cuarto) => cuarto.ordenRecorrido)
  expect(orden).toEqual([...orden].sort((a, b) => a - b))
})

test('una marca de más no puede iluminar un cuarto por encima de uno', () => {
  // Datos raros —dos marcas de la misma tarea— no pueden producir una luz de 2.
  const repetidas = [...TAREAS_COCINA.map((tarea) => tarea.id), TAREAS_COCINA[0]!.id, TAREAS_COCINA[0]!.id]
  const [cuarto] = armarLaCasa({
    catalogo: [COCINA],
    elegidos: [COCINA],
    tareasPorAmbiente: { cocina: TAREAS_COCINA },
    hechasPorAmbiente: { cocina: repetidas },
  })

  expect(cuarto?.luz).toBe(1)
  expect(cuarto?.luz).toBeLessThanOrEqual(1)
})
