/*
  Música para arrancar la sesión.

  La decisión importante está en lo que NO usa: la API de Spotify. Pide registrar
  una app, manejar el permiso de cada persona y que inicien sesión con su cuenta, y
  controlar la reproducción exige Premium. Para una app cuyo principio es «ninguna
  función exige cuenta», eso es contradictorio, y un enlace común abre la app con un
  toque: sin API, sin permisos, sin costo y sin que un tercero pueda rompernos nada.

  Y son BÚSQUEDAS, no playlists puntuales. Una playlist la borran, la hacen privada
  o no está disponible en el país de quien la usa; una búsqueda no se muere nunca.
*/

export interface OpcionDeMusica {
  nombre: string
  url: string
}

const CONSULTA_CORTA = 'música para limpiar rápido'
const CONSULTA_LARGA = 'música para limpiar la casa'

export function opcionesDeMusica(minutos: number | null, playlistPropia: string | null = null): OpcionDeMusica[] {
  // Una sesión corta pide algo movido; una larga, algo para aguantar.
  const consulta = minutos !== null && minutos <= 20 ? CONSULTA_CORTA : CONSULTA_LARGA
  const codificada = encodeURIComponent(consulta)

  const busquedas: OpcionDeMusica[] = [
    { nombre: 'Spotify', url: `https://open.spotify.com/search/${codificada}` },
    { nombre: 'YouTube', url: `https://www.youtube.com/results?search_query=${codificada}` },
  ]

  // Si la persona pegó su playlist, va primero: es la que quiere escuchar. Las
  // búsquedas quedan al lado, porque puede querer otra cosa ese día.
  const propia = playlistPropia?.trim()
  if (propia && esPlaylistValida(propia)) return [{ nombre: 'Tu playlist', url: propia }, ...busquedas]

  return busquedas
}

/** Los sitios que se ofrecen: los dos que la pantalla de Ajustes nombra. */
const SITIOS_DE_MUSICA = new Set([
  'open.spotify.com',
  'spotify.com',
  'www.spotify.com',
  'spotify.link',
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
])

/**
 * Si una dirección sirve como playlist: `https` y de Spotify o YouTube.
 *
 * No es solo prolijidad. La dirección termina como `href` de un enlace, así que sin
 * esto un `javascript:` pegado —o llegado en una copia importada de otro teléfono—
 * se ejecutaría al tocar «Tu playlist». Por eso se valida al guardar y también al
 * mostrar.
 */
export function esPlaylistValida(direccion: string): boolean {
  try {
    const url = new URL(direccion.trim())
    return url.protocol === 'https:' && SITIOS_DE_MUSICA.has(url.hostname.toLowerCase())
  } catch {
    return false
  }
}
