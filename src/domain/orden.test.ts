import { expect, test } from 'vitest'
import { comparar } from './orden'

/*
  Este test distingue el orden por código del orden por idioma: `localeCompare` en
  español pone 'a' antes que 'B', y comparar los caracteres pone 'B' antes que 'a'.
  Si alguien vuelve a usar `localeCompare` para desempatar, esto se pone en rojo.
*/

test('ordena por código y no por idioma', () => {
  expect(['b', 'A', 'a', 'B'].sort(comparar)).toEqual(['A', 'B', 'a', 'b'])
})

test('dos cadenas iguales empatan', () => {
  expect(comparar('cocina-trapear', 'cocina-trapear')).toBe(0)
})

test('el orden por código NO es el orden del idioma, y es el que queremos', () => {
  // El test anterior ordenaba el mismo arreglo dos veces y lo comparaba consigo
  // mismo: no podía fallar nunca. Éste compara contra el comportamiento del idioma,
  // que es justo lo que se está evitando.
  // Por código, la minúscula va después: 'a' (97) > 'B' (66).
  expect(comparar('a', 'B')).toBeGreaterThan(0)
  // En español, en cambio, la 'a' va antes que la 'b', sin importar la caja.
  expect('a'.localeCompare('B', 'es')).toBeLessThan(0)
})
