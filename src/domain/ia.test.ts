import { expect, test } from 'vitest'
import { armarPedido, leerSugerencias } from './ia'
import { VERBOS } from './tipos'

/*
  La IA.

  Lo que se prueba acá no es que el modelo sea bueno —eso no se puede probar— sino
  que la app SOBREVIVE a lo que devuelva. Los modelos contestan con bloques de
  código, con una frase de cortesía adelante, con texto truncado o con basura. Nada
  de eso puede romper una pantalla ni colarse en la lista de nadie.
*/

test('el pedido nombra el ambiente, lo que ya está y lo que la persona contó', () => {
  const pedido = armarPedido({
    ambiente: 'la cocina',
    yaIncluidas: ['Limpiá la mesada', 'Barré el piso'],
    descripcion: 'hay ropa tirada',
    hayFoto: false,
  })

  expect(pedido).toContain('la cocina')
  expect(pedido).toContain('Limpiá la mesada')
  expect(pedido).toContain('hay ropa tirada')
  expect(pedido).not.toContain('Mirá la foto')
})

test('con foto, el pedido pide mirarla de verdad', () => {
  const pedido = armarPedido({ ambiente: 'el baño', yaIncluidas: [], descripcion: null, hayFoto: true })
  expect(pedido).toContain('Mirá la foto')
})

test('el pedido exige JSON puro: es lo que hace parseable la respuesta', () => {
  const pedido = armarPedido({ ambiente: 'el living', yaIncluidas: [], descripcion: null, hayFoto: false })
  expect(pedido).toContain('SOLO con un arreglo JSON')
  expect(pedido).toContain('sin bloques de código')
  // Y los verbos salen del vocabulario del catálogo, no de la imaginación del modelo.
  for (const verbo of VERBOS) expect(pedido).toContain(verbo)
})

test('lee un arreglo limpio', () => {
  const texto = '[{"accion":"Limpiá","descripcion":"la mesada","duracionMin":8,"verbo":"limpiar"}]'
  const sugerencias = leerSugerencias(texto)

  expect(sugerencias).toHaveLength(1)
  expect(sugerencias[0]).toEqual({
    accion: 'Limpiá',
    descripcion: 'la mesada',
    duracionMin: 8,
    verbo: 'limpiar',
  })
})

test('lee aunque venga envuelto en un bloque de código', () => {
  const texto = '```json\n[{"accion":"Barré","descripcion":"el piso","duracionMin":10,"verbo":"limpiar"}]\n```'
  expect(leerSugerencias(texto)).toHaveLength(1)
})

test('lee aunque el modelo agregue una frase de cortesía', () => {
  const texto = '¡Claro! Acá van las ideas:\n[{"accion":"Ordená","descripcion":"la ropa","duracionMin":15,"verbo":"ordenar"}]\nEspero que te sirvan.'
  const sugerencias = leerSugerencias(texto)

  expect(sugerencias).toHaveLength(1)
  expect(sugerencias[0]?.accion).toBe('Ordená')
})

test('con basura devuelve una lista vacía en vez de explotar', () => {
  expect(leerSugerencias('')).toEqual([])
  expect(leerSugerencias('no tengo idea')).toEqual([])
  expect(leerSugerencias('[{"accion":')).toEqual([])
  expect(leerSugerencias('{"accion":"suelta"}')).toEqual([])
  expect(leerSugerencias('null')).toEqual([])
})

test('descarta las sugerencias incompletas y se queda con las buenas', () => {
  const texto = JSON.stringify([
    { accion: '', descripcion: 'sin acción', duracionMin: 5, verbo: 'limpiar' },
    { accion: 'Limpiá', descripcion: 'la mesada', duracionMin: 8, verbo: 'limpiar' },
    { descripcion: 'sin acción directamente', duracionMin: 5, verbo: 'limpiar' },
    { accion: 'Ordená', descripcion: 'la alacena', duracionMin: 'no es un número', verbo: 'ordenar' },
  ])

  const sugerencias = leerSugerencias(texto)
  expect(sugerencias).toHaveLength(1)
  expect(sugerencias[0]?.accion).toBe('Limpiá')
})

test('un verbo inventado cae en «ordenar» en vez de romper el plan', () => {
  const texto = '[{"accion":"Desintegrá","descripcion":"el sillón","duracionMin":5,"verbo":"desintegrar"}]'
  expect(leerSugerencias(texto)[0]?.verbo).toBe('ordenar')
})

test('los minutos se acotan a algo que entra en una sesión', () => {
  const texto = JSON.stringify([
    { accion: 'Limpiá', descripcion: 'todo', duracionMin: 600, verbo: 'limpiar' },
    { accion: 'Guardá', descripcion: 'una cosa', duracionMin: 0, verbo: 'guardar' },
  ])

  const sugerencias = leerSugerencias(texto)
  expect(sugerencias[0]?.duracionMin).toBe(120)
  expect(sugerencias[1]?.duracionMin).toBe(2)
})

test('no devuelve más de ocho ideas: una lista larga no es una ayuda', () => {
  const muchas = Array.from({ length: 20 }, (_, indice) => ({
    accion: `Tarea ${indice}`,
    descripcion: 'algo',
    duracionMin: 5,
    verbo: 'ordenar',
  }))

  expect(leerSugerencias(JSON.stringify(muchas))).toHaveLength(8)
})

test('una acción larguísima se descarta: no entra en la pantalla del paso', () => {
  const larga = 'A'.repeat(300)
  expect(leerSugerencias(JSON.stringify([{ accion: larga, descripcion: 'x', duracionMin: 5, verbo: 'ordenar' }]))).toEqual(
    [],
  )
})
