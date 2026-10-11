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

export function opcionesDeMusica(minutos: number | null): OpcionDeMusica[] {
  // Una sesión corta pide algo movido; una larga, algo para aguantar.
  const consulta = minutos !== null && minutos <= 20 ? CONSULTA_CORTA : CONSULTA_LARGA
  const codificada = encodeURIComponent(consulta)

  return [
    { nombre: 'Spotify', url: `https://open.spotify.com/search/${codificada}` },
    { nombre: 'YouTube', url: `https://www.youtube.com/results?search_query=${codificada}` },
  ]
}
