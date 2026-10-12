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

test('el resultado no depende del idioma del dispositivo', () => {
  const ids = ['ambiente-10', 'ambiente-2', 'Bano', 'bano', 'cocina']
  const una = [...ids].sort(comparar)
  const otra = [...ids].sort(comparar)
  expect(una).toEqual(otra)
  expect(una).toEqual(['Bano', 'ambiente-10', 'ambiente-2', 'bano', 'cocina'])
})
