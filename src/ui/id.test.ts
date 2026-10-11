import { expect, test } from 'vitest'
import { nuevoId } from './id'

/*
  Este test existe por un defecto real: `crypto.randomUUID` no está disponible
  cuando la app se sirve por HTTP en la red local, que es como se prueba en un
  teléfono. Armaba el plan en la computadora y fallaba en el celular.
*/

test('genera un identificador cuando el navegador tiene randomUUID', () => {
  expect(nuevoId()).toMatch(/^[0-9a-f-]{32,36}$/)
})

test('genera un identificador aunque el navegador NO tenga randomUUID', () => {
  // Se simula un navegador sin contexto seguro, como el de un teléfono por HTTP.
  const original = crypto.randomUUID
  Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true })

  try {
    const id = nuevoId()
    expect(id).toMatch(/^[0-9a-f]{32}$/)
    expect(id).not.toBe(nuevoId())
  } finally {
    Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true })
  }
})
