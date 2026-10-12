import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { CATALOGO } from '../../domain/catalogo'
import { comparar } from '../../domain/orden'
import { HERRAMIENTAS_POR_DEFECTO } from '../../domain/tipos'
import { useSesion } from '../estado/sesion'
import { useTitulo } from '../estado/useTitulo'
import type { Modo, Preferencias } from '../../domain/tipos'

/*
  Ajustes: lo que la app necesita saber de tu casa para no proponerte cosas
  imposibles.

  Esta pantalla es la que faltaba para que una regla del motor sirva de algo. El
  motor ya sabía que, si no tenés trapo, no hay que mandarte a trapear, y que si eso
  borra tu único paso de dos minutos hay que usar un respaldo y avisarte. Pero no
  había ningún lugar donde decirle qué tenés, así que esa regla nunca se activaba:
  era código correcto y probado, e inalcanzable.
*/

const MODOS: { valor: Modo; nombre: string }[] = [
  { valor: 'arrancarYa', nombre: 'Arrancar ya' },
  { valor: 'ambientePorAmbiente', nombre: 'Ambiente por ambiente' },
  { valor: 'puestaAPunto', nombre: 'Puesta a punto' },
]

/*
  Las herramientas salen del catálogo, no de una lista escrita a mano: si mañana se
  agrega una tarea que pide aspiradora, aparece sola acá y no hay forma de que la
  pantalla y el catálogo se desincronicen.
*/
function todasLasHerramientas(): string[] {
  const todas = new Set<string>(HERRAMIENTAS_POR_DEFECTO)
  for (const tarea of CATALOGO.tareas) {
    for (const herramienta of tarea.herramientas) todas.add(herramienta)
  }
  return [...todas].sort(comparar)
}

export default function Ajustes() {
  const repositorio = useSesion((estado) => estado.repositorio)
  const [preferencias, setPreferencias] = useState<Preferencias | null>(null)
  const [playlist, setPlaylist] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)

  useTitulo('Ajustes')

  useEffect(() => {
    let vigente = true

    void (async () => {
      const guardadas = await repositorio.preferencias()
      if (!vigente) return
      setPreferencias(guardadas)
      setPlaylist(guardadas.playlistPropia ?? '')
    })()

    return () => {
      vigente = false
    }
  }, [repositorio])

  /*
    Se guarda sin hacer esperar a la persona y se revierte si falla: en un teléfono,
    que la casilla no responda hasta que conteste el disco se siente roto.
  */
  async function guardar(cambio: Partial<Preferencias>): Promise<void> {
    if (!preferencias) return
    const anterior = preferencias
    setPreferencias({ ...preferencias, ...cambio })
    setError(null)
    setGuardado(false)

    try {
      await repositorio.guardarPreferencias({ ...preferencias, ...cambio })
      setGuardado(true)
    } catch {
      setPreferencias(anterior)
      setError('No pudimos guardar los ajustes. Probá de nuevo.')
    }
  }

  async function alternarHerramienta(herramienta: string): Promise<void> {
    if (!preferencias) return
    const tiene = preferencias.herramientasDisponibles.includes(herramienta)
    const lista = tiene
      ? preferencias.herramientasDisponibles.filter((cada) => cada !== herramienta)
      : [...preferencias.herramientasDisponibles, herramienta]
    await guardar({ herramientasDisponibles: lista })
  }

  if (!preferencias) {
    return (
      <main className="pantalla">
        <h1 className="pantalla__titulo">Ajustes</h1>
        <p className="menudo">Cargando…</p>
      </main>
    )
  }

  return (
    <main className="pantalla">
      <h1 className="pantalla__titulo">Ajustes</h1>

      <fieldset className="grupo">
        <legend className="menudo">Qué tenés en casa</legend>
        <p className="menudo">
          Si no tenés algo, no te lo vamos a pedir: las tareas que lo necesitan quedan afuera del plan.
        </p>
        <ul className="fichas">
          {todasLasHerramientas().map((herramienta) => {
            const tiene = preferencias.herramientasDisponibles.includes(herramienta)
            return (
              <li key={herramienta} className="tarea">
                <label
                  htmlFor={`herramienta-${herramienta}`}
                  className={tiene ? 'ficha ficha--elegida' : 'ficha'}
                >
                  <input
                    id={`herramienta-${herramienta}`}
                    type="checkbox"
                    className="ficha__entrada"
                    checked={tiene}
                    onChange={() => void alternarHerramienta(herramienta)}
                  />
                  <span className="ficha__marca" aria-hidden="true" />
                  <span className="ficha__texto">{herramienta}</span>
                </label>
              </li>
            )
          })}
        </ul>
      </fieldset>

      <fieldset className="grupo">
        <legend className="menudo">Cómo querés que ordene</legend>
        <ul className="fichas fichas--una-columna">
          {MODOS.map((opcion) => (
            <li key={opcion.valor}>
              <label
                htmlFor={`modo-defecto-${opcion.valor}`}
                className={preferencias.modoPorDefecto === opcion.valor ? 'ficha ficha--elegida' : 'ficha'}
              >
                <input
                  id={`modo-defecto-${opcion.valor}`}
                  type="radio"
                  name="modoPorDefecto"
                  value={opcion.valor}
                  className="ficha__entrada"
                  checked={preferencias.modoPorDefecto === opcion.valor}
                  onChange={() => void guardar({ modoPorDefecto: opcion.valor })}
                />
                <span className="ficha__marca" aria-hidden="true" />
                <span className="ficha__texto">{opcion.nombre}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <form
        className="grupo"
        onSubmit={(evento) => {
          evento.preventDefault()
          void guardar({ playlistPropia: playlist.trim() === '' ? null : playlist.trim() })
        }}
      >
        <label className="menudo" htmlFor="playlist">
          Tu música, si querés
        </label>
        <p className="menudo">
          Pegá la dirección de una playlist de Spotify o YouTube y te la ofrecemos al arrancar.
        </p>
        <input
          id="playlist"
          name="playlist"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://open.spotify.com/playlist/…"
          value={playlist}
          onChange={(evento) => setPlaylist(evento.target.value)}
        />
        <button type="submit" className="boton-secundario">
          Guardar la playlist
        </button>
      </form>

      <div className="pantalla__pie">
        {error && (
          <p className="alerta" role="status" aria-live="polite">
            {error}
          </p>
        )}
        {guardado && !error && <p className="menudo">Listo, quedó guardado.</p>}
        <Link className="boton-principal" to="/">
          Volver al principio
        </Link>
      </div>
    </main>
  )
}
