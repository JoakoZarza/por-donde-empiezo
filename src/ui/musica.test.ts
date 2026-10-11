import { expect, test } from 'vitest'
import { opcionesDeMusica } from './musica'

/*
  Música para arrancar.

  La decisión importante está en lo que NO usa: la API de Spotify. Pide registrar
  una app, manejar el permiso de cada persona y que inicien sesión con su cuenta,
  y controlar la reproducción exige Premium. Para una app cuyo principio es
  «ninguna función exige cuenta», eso es contradictorio, y un enlace común abre la
  app con un toque.

  Y por eso son BÚSQUEDAS y no playlists puntuales: una playlist la borran, la
  hacen privada o no está disponible en el país de quien la usa. Una búsqueda no
  se muere nunca.
*/

test('ofrece Spotify y YouTube', () => {
  expect(opcionesDeMusica(30).map((opcion) => opcion.nombre)).toEqual(['Spotify', 'YouTube'])
})

test('las direcciones son búsquedas, no playlists que se puedan morir', () => {
  for (const opcion of opcionesDeMusica(30)) {
    expect(opcion.url).toMatch(/^https:\/\//)
    expect(opcion.url).not.toMatch(/playlist/i)
  }
})

test('la consulta va codificada, sin espacios sueltos', () => {
  for (const opcion of opcionesDeMusica(30)) {
    expect(opcion.url).not.toMatch(/ /)
  }
  expect(opcionesDeMusica(30)[1]!.url).toContain('search_query=')
})

test('una sesión corta pide música distinta que una larga', () => {
  const corta = opcionesDeMusica(10)[0]!.url
  const larga = opcionesDeMusica(60)[0]!.url
  expect(corta).not.toBe(larga)
  expect(decodeURIComponent(corta)).toMatch(/r[aá]pido/i)
})

test('sin límite de tiempo usa la consulta de sesión larga', () => {
  expect(decodeURIComponent(opcionesDeMusica(null)[0]!.url)).toMatch(/casa/i)
})
