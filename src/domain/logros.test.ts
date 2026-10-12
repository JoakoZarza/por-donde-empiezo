import { expect, test } from 'vitest'
import { calcularLogros, calcularTotales, diasEntre, diasSinVenir } from './logros'
import type { MarcaDeHistorial } from './logros'

/*
  Los totales y los logros.

  El test que más importa de todos es el de «nunca baja»: es la regla que sostiene
  la promesa de la app. Un indicador que baja por no usarla convierte la app en una
  deuda, y es exactamente lo que este producto no hace.
*/

function marca(hechoEn: string, minutos = 10, tareaId = 'cocina-barrer'): MarcaDeHistorial {
  return { tareaId, ambienteId: 'cocina', minutos, hechoEn }
}

const DIA = '2026-10-'
const en = (dia: number, hora = '21'): string => `${DIA}${String(dia).padStart(2, '0')}T${hora}:00:00.000Z`

test('sin historial, los totales están en cero y no en nulo', () => {
  const totales = calcularTotales([])
  expect(totales.tareas).toBe(0)
  expect(totales.minutos).toBe(0)
  expect(totales.diasActivos).toBe(0)
  expect(totales.primeroEn).toBeNull()
  expect(totales.ultimoEn).toBeNull()
  expect(totales.mayorPausaDias).toBe(0)
})

test('suma tareas, minutos y días distintos', () => {
  const totales = calcularTotales([marca(en(1)), marca(en(1), 5), marca(en(3), 20)])

  expect(totales.tareas).toBe(3)
  expect(totales.minutos).toBe(35)
  expect(totales.diasActivos).toBe(2)
  expect(totales.primeroEn).toBe(en(1))
  expect(totales.ultimoEn).toBe(en(3))
})

test('los totales NUNCA bajan: agregar marcas no puede reducir ninguno', () => {
  // Es la regla del producto, escrita como propiedad. Si alguien cambia el cálculo
  // por uno que dependa del ciclo actual, esto se pone en rojo.
  const historial: MarcaDeHistorial[] = [marca(en(1)), marca(en(2), 30), marca(en(9), 5)]

  let anteriores = calcularTotales([])
  for (let corte = 1; corte <= historial.length; corte += 1) {
    const actuales = calcularTotales(historial.slice(0, corte))
    expect(actuales.tareas).toBeGreaterThanOrEqual(anteriores.tareas)
    expect(actuales.minutos).toBeGreaterThanOrEqual(anteriores.minutos)
    expect(actuales.diasActivos).toBeGreaterThanOrEqual(anteriores.diasActivos)
    anteriores = actuales
  }
})

test('«Volviste» mide la pausa más larga, no cuánto hace que no venís', () => {
  // Dos días seguidos, siete de silencio, y vuelta: ahí hay un «Volviste».
  const conPausa = calcularTotales([marca(en(1)), marca(en(2)), marca(en(9)), marca(en(10))])
  expect(conPausa.mayorPausaDias).toBe(7)

  // Alguien que viene todos los días no tiene ninguna pausa que festejar.
  const sinPausa = calcularTotales([marca(en(1)), marca(en(2)), marca(en(3))])
  expect(sinPausa.mayorPausaDias).toBe(1)
})

test('un logro conseguido no se pierde al seguir haciendo cosas', () => {
  const poco = calcularTotales([marca(en(1))])
  const mucho = calcularTotales([marca(en(1)), marca(en(2)), marca(en(3)), marca(en(4))])

  const ganados = (totales: typeof poco): string[] =>
    calcularLogros(totales, 1)
      .filter((logro) => logro.conseguido)
      .map((logro) => logro.id)

  for (const id of ganados(poco)) {
    expect(ganados(mucho)).toContain(id)
  }
})

test('los logros se destapan con el trabajo, y «Volviste» solo si volviste', () => {
  // Sin trabajo y sin ambientes elegidos no hay nada ganado. Con los ocho elegidos sí
  // se gana «La casa entera», y por eso su texto dice «elegiste» y no «tocaste».
  const vacio = calcularLogros(calcularTotales([]), 0)
  expect(vacio.every((logro) => !logro.conseguido)).toBe(true)

  const conPausa = calcularTotales([marca(en(1)), marca(en(2)), marca(en(9))])
  const logros = calcularLogros(conPausa, 8)

  expect(logros.find((logro) => logro.id === 'primera')?.conseguido).toBe(true)
  expect(logros.find((logro) => logro.id === 'volviste')?.conseguido).toBe(true)
  expect(logros.find((logro) => logro.id === 'cincuenta')?.conseguido).toBe(false)
})

test('la casa entera necesita los ocho ambientes, no siete', () => {
  const totales = calcularTotales([marca(en(1))])
  expect(calcularLogros(totales, 7).find((logro) => logro.id === 'casa-entera')?.conseguido).toBe(false)
  expect(calcularLogros(totales, 8).find((logro) => logro.id === 'casa-entera')?.conseguido).toBe(true)
})

test('los días entre dos instantes se cuentan en días enteros', () => {
  expect(diasEntre(en(1), en(1))).toBe(0)
  expect(diasEntre(en(1), en(4))).toBe(3)
  expect(diasEntre(en(1), en(1, '23'))).toBe(0)
})

test('los días sin venir nunca son negativos, aunque el reloj vaya para atrás', () => {
  // Un teléfono con la fecha mal puesta no puede mostrar «hace -3 días».
  const totales = calcularTotales([marca(en(20))])
  expect(diasSinVenir(totales, en(1))).toBe(0)
  expect(diasSinVenir(calcularTotales([]), en(1))).toBeNull()
})
