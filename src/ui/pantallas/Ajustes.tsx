import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { CATALOGO } from '../../domain/catalogo'
import { comparar } from '../../domain/orden'
import { HERRAMIENTAS_POR_DEFECTO } from '../../domain/tipos'
import { useSesion } from '../estado/sesion'
import { useTitulo } from '../estado/useTitulo'
import { leerRespaldo, nombreDelArchivo, RespaldoInvalido } from '../../domain/respaldo'
import { consultarIa, FalloDeIa } from '../../data/iaCliente'
import type { EstiloDeReloj, Modo, Preferencias } from '../../domain/tipos'

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

const ESTILOS: { valor: EstiloDeReloj; nombre: string }[] = [
  { valor: 'carrera', nombre: 'Carrera: el reloj sube y ves cuánto ganás' },
  { valor: 'cuentaAtras', nombre: 'Cuenta atrás: el reloj baja hasta cero' },
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
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [clave, setClave] = useState('')
  const [probando, setProbando] = useState(false)

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

  async function guardarClave(): Promise<void> {
    // Se sacan los espacios de los costados: pegar una clave arrastra un salto de
    // línea casi siempre, y después el error es imposible de ver.
    const limpia = clave.trim()
    if (limpia === '') {
      // Antes esto no hacía nada y no decía nada, que es la peor combinación: la
      // persona toca, no pasa nada, y no sabe si la app está rota o si se equivocó.
      setMensaje(null)
      setError('Pegá una clave primero. Si ya no querés usar la IA, tocá «Borrar la clave».')
      return
    }

    await guardar({ claveDeIa: limpia })
    setClave('')
    setMensaje('Listo, la clave quedó guardada en este teléfono.')
  }

  async function borrarClave(): Promise<void> {
    await guardar({ claveDeIa: null })
    setClave('')
    setMensaje('Listo, borramos la clave de este teléfono.')
  }

  async function probarClave(): Promise<void> {
    const limpia = clave.trim()
    if (limpia === '') {
      setMensaje(null)
      setError('Escribí la clave en el campo de arriba y después tocá «Probar».')
      return
    }

    setProbando(true)
    setError(null)
    setMensaje(null)
    try {
      // Un pedido de una palabra: alcanza para saber si la clave sirve, y gasta lo
      // mínimo de la cuota gratuita de la persona.
      const respuesta = await consultarIa({ clave: limpia, texto: 'Contestá solamente: listo', imagen: null })
      setMensaje(`La clave funciona. La IA contestó «${respuesta.slice(0, 40)}».`)
    } catch (falla) {
      setError(falla instanceof FalloDeIa ? falla.message : 'No pudimos probar la clave.')
    } finally {
      setProbando(false)
    }
  }

  async function guardarCopia(): Promise<void> {
    setError(null)
    setMensaje(null)
    try {
      const respaldo = await repositorio.exportar()
      // Un archivo común, que la persona manda por donde quiera. Nada sale del
      // teléfono hasta que ella lo saca.
      const blob = new Blob([JSON.stringify(respaldo)], { type: 'application/json' })
      const enlace = document.createElement('a')
      enlace.href = URL.createObjectURL(blob)
      enlace.download = nombreDelArchivo(respaldo.generadoEn)
      enlace.click()
      URL.revokeObjectURL(enlace.href)
      setMensaje('Listo, la copia se bajó a tu teléfono.')
    } catch {
      setError('No pudimos armar la copia. Probá de nuevo.')
    }
  }

  async function traerCopia(archivo: File): Promise<void> {
    setError(null)
    setMensaje(null)
    try {
      const respaldo = leerRespaldo(await archivo.text())
      await repositorio.importar(respaldo)
      setMensaje('Listo, se sumó todo lo que faltaba. Nada de lo que tenías se perdió.')
    } catch (falla) {
      // Si el archivo está mal, se dice por qué. «Error al importar» no le sirve
      // a nadie que acaba de elegir el archivo equivocado.
      setError(falla instanceof RespaldoInvalido ? falla.message : 'No pudimos leer el archivo.')
    }
  }

  async function empezarDeCero(): Promise<void> {
    const confirmado = window.confirm(
      'Se borra todo de este teléfono: los ambientes, las tareas y los totales. No se puede deshacer. ¿Seguro?',
    )
    if (!confirmado) return

    setError(null)
    setMensaje(null)
    try {
      await repositorio.borrarTodo()
      setMensaje('Listo, este teléfono quedó en cero.')
    } catch {
      setError('No pudimos borrar los datos.')
    }
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

      <section className="grupo">
        <h2 className="pantalla__titulo">Ideas con IA</h2>
        <p className="menudo">
          Es opcional, y la app funciona entera sin esto: la IA sirve para tirarte ideas cuando no sabés por dónde
          empezar con un ambiente.
        </p>

        <label className="ficha" htmlFor="acepto-ia">
          <input
            id="acepto-ia"
            type="checkbox"
            className="ficha__entrada"
            checked={preferencias.avisoDePrivacidadAceptado}
            onChange={(evento) => void guardar({ avisoDePrivacidadAceptado: evento.target.checked })}
          />
          <span className="ficha__marca" aria-hidden="true" />
          <span className="ficha__texto">
            Entiendo y quiero usarla
            <span className="menudo">
              Tu clave se guarda solo en este teléfono y se manda únicamente a Google, cuando vos pedís una idea. No
              pasa por ningún servidor nuestro, porque no tenemos. Si perdés el teléfono, revocá la clave desde tu
              cuenta de Google.
            </span>
          </span>
        </label>

        {preferencias.claveDeIa && (
          <p className="menudo">
            Hay una clave guardada en este teléfono.{' '}
            <button type="button" className="boton-secundario" onClick={() => void borrarClave()}>
              Borrar la clave
            </button>
          </p>
        )}

        <form
          onSubmit={(evento) => {
            evento.preventDefault()
            void guardarClave()
          }}
        >
          <label className="menudo" htmlFor="clave-ia">
            Tu clave de Google
          </label>
          {/*
            El campo se muestra siempre, deshabilitado hasta que se acepta el aviso.
            Antes aparecía recién al aceptarlo, así que tocar el tilde parecía no
            hacer nada: la pantalla cambiaba abajo, fuera de la vista.
          */}
          {!preferencias.avisoDePrivacidadAceptado && (
            <p className="menudo">Aceptá el aviso de arriba para poder cargarla.</p>
          )}
          <input
            id="clave-ia"
            name="clave-ia"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="Pegá tu clave acá…"
            value={clave}
            disabled={!preferencias.avisoDePrivacidadAceptado}
            onChange={(evento) => setClave(evento.target.value)}
          />
          <div className="acciones">
            <button
              type="submit"
              className="boton-secundario"
              disabled={!preferencias.avisoDePrivacidadAceptado}
            >
              Guardar la clave
            </button>
            <button
              type="button"
              className="boton-secundario"
              onClick={() => void probarClave()}
              disabled={!preferencias.avisoDePrivacidadAceptado}
              aria-busy={probando}
            >
              {probando ? 'Probando…' : 'Probar'}
            </button>
          </div>
        </form>
      </section>

      <fieldset className="grupo">
        <legend className="menudo">Cómo medimos el tiempo</legend>
        <p className="menudo">
          La cuenta atrás baja hasta cero y se siente como una carrera contra el reloj. La carrera sube y te va
          mostrando cuántos segundos ganás o perdés contra lo que estaba estimado: terminás antes y ganás, terminás
          después y perdés. Ninguna de las dos te cuesta nada.
        </p>
        <ul className="fichas fichas--una-columna">
          {ESTILOS.map((opcion) => (
            <li key={opcion.valor}>
              <label
                htmlFor={`reloj-${opcion.valor}`}
                className={preferencias.estiloDeReloj === opcion.valor ? 'ficha ficha--elegida' : 'ficha'}
              >
                <input
                  id={`reloj-${opcion.valor}`}
                  type="radio"
                  name="estiloDeReloj"
                  value={opcion.valor}
                  className="ficha__entrada"
                  checked={preferencias.estiloDeReloj === opcion.valor}
                  onChange={() => void guardar({ estiloDeReloj: opcion.valor })}
                />
                <span className="ficha__marca" aria-hidden="true" />
                <span className="ficha__texto">{opcion.nombre}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <section className="grupo">
        <h2 className="pantalla__titulo">Tus datos</h2>
        <p className="menudo">
          Todo esto vive solo en este teléfono. Para pasar tu trabajo a otro, bajá una copia y llevala como cualquier
          archivo: al traerla se suma a lo que ese teléfono ya tenga. Nunca lo reemplaza.
        </p>

        <button type="button" className="boton-secundario" onClick={() => void guardarCopia()}>
          Guardar una copia
        </button>

        <label className="menudo" htmlFor="copia">
          Traer de otra copia
        </label>
        <input
          id="copia"
          name="copia"
          type="file"
          accept="application/json,.json"
          onChange={(evento) => {
            const archivo = evento.target.files?.[0]
            if (archivo) void traerCopia(archivo)
            // Se limpia para que elegir el mismo archivo dos veces vuelva a disparar.
            evento.target.value = ''
          }}
        />

        <button type="button" className="boton-secundario" onClick={() => void empezarDeCero()}>
          Empezar de cero en este teléfono
        </button>
      </section>

      <div className="pantalla__pie">
        {error && (
          <p className="alerta" role="status" aria-live="polite">
            {error}
          </p>
        )}
        {mensaje && !error && (
          <p className="menudo" role="status" aria-live="polite">
            {mensaje}
          </p>
        )}
        {guardado && !error && !mensaje && <p className="menudo">Listo, quedó guardado.</p>}
        <Link className="boton-principal" to="/">
          Volver al principio
        </Link>
      </div>
    </main>
  )
}
