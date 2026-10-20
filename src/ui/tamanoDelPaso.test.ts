import { expect, test } from 'vitest'
import { tamanoDelPaso } from './tamanoDelPaso'
import { CATALOGO } from '../domain/catalogo'

/*
  La consigna del paso entra entera: el tamaño de letra baja según el largo. Que
  entre de verdad se comprobó midiendo en el navegador a 360 y 320 px; acá se fija
  la regla que lo hace posible.
*/

test.each([
  ['Barré el piso', 'grande'],
  ['Despejá la mesada', 'grande'],
  ['Limpiá el filtro del lavarropas', 'mediano'],
  ['Llevá las tazas y los vasos a la cocina', 'chico'],
  ['Revisar la caja de la mudanza que quedó en el placard del pasillo', 'minimo'],
] as const)('«%s» va en tamaño %s', (consigna, esperado) => {
  expect(tamanoDelPaso(consigna)).toBe(esperado)
})

test('ninguna tarea del catálogo cae en el tamaño mínimo', () => {
  // El mínimo es para tareas propias largas. Si una del catálogo llega ahí, la
  // consigna está mal escrita: es una instrucción, no un párrafo.
  for (const tarea of CATALOGO.tareas) {
    const consigna = `${tarea.accion} ${tarea.descripcion}`.trim()
    expect(tamanoDelPaso(consigna), consigna).not.toBe('minimo')
  }
})

test('los espacios de los costados no cuentan', () => {
  expect(tamanoDelPaso('   Barré el piso   ')).toBe('grande')
})
