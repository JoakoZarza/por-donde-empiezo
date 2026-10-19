import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { CATALOGO } from '../../domain/catalogo'
import { comparar } from '../../domain/orden'
import { HERRAMIENTAS_POR_DEFECTO } from '../../domain/tipos'
import { useSesion } from '../estado/sesion'
import { useTitulo } from '../estado/useTitulo'
import { useAvisos } from '../estado/avisos'
import SelectorDeArchivo from '../componentes/SelectorDeArchivo'
import Esqueleto from '../componentes/Esqueleto'
import ErrorDeCarga from '../componentes/ErrorDeCarga'
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

/*
  Dónde se muestra cada aviso. Antes todos —errores y confirmaciones— iban al pie de
  la página, y en un celular «Pegá una clave primero» quedaba fuera de la vista:
  la persona tocaba y no veía pasar nada. Ahora cada aviso aparece junto al control
  que lo causó.
*/
type Lugar = 'herramientas' | 'modo' | 'playlist' | 'clave' | 'reloj' | 'datos' | 'cero'

interface Aviso {
  lugar: Lugar
  tipo: 'error' | 'listo'
  texto: string
}

function AvisoEn({ lugar, aviso, id }: { lugar: Lugar; aviso: Aviso | null; id?: string }) {
  // La región existe siempre, vacía o no: un `aria-live` que aparece junto con su
  // texto no siempre se anuncia.
  const visible = aviso?.lugar === lugar ? aviso : null
  return (
    <div id={id} role="status" aria-live="polite">
      {visible && <p className={visible.tipo === 'error' ? 'alerta' : 'menudo'}>{visible.texto}</p>}
    </div>
  )
}

export default function Ajustes() {
  const repositorio = useSesion((estado) => estado.repositorio)
  const [preferencias, setPreferencias] = useState<Preferencias | null>(null)
  const [playlist, setPlaylist] = useState('')
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const campoClave = useRef<HTMLInputElement>(null)
  const confirmar = useAvisos((estado) => estado.confirmar)
  const [clave, setClave] = useState('')
  const [probando, setProbando] = useState(false)
  const [falloLaCarga, setFalloLaCarga] = useState(false)
  const [intento, setIntento] = useState(0)

  useTitulo('Ajustes')

  useEffect(() => {
    let vigente = true

    void (async () => {
      try {
        const guardadas = await repositorio.preferencias()
        if (!vigente) return
        setPreferencias(guardadas)
        setPlaylist(guardadas.playlistPropia ?? '')
      } catch {
        if (vigente) setFalloLaCarga(true)
      }
    })()

    return () => {
      vigente = false
    }
  }, [repositorio, intento])

  /*
    Se guarda sin hacer esperar a la persona y se revierte si falla: en un teléfono,
    que la casilla no responda hasta que conteste el disco se siente roto.
  */
  /** Devuelve si se guardó, para que quien llama no confirme algo que no pasó. */
  async function guardar(
    cambio: Partial<Preferencias>,
    lugar: Lugar,
    siSale = 'Listo, quedó guardado.',
  ): Promise<boolean> {
    if (!preferencias) return false
    const anterior = preferencias
    setPreferencias({ ...preferencias, ...cambio })
    setAviso(null)

    try {
      await repositorio.guardarPreferencias({ ...preferencias, ...cambio })
      setAviso({ lugar, tipo: 'listo', texto: siSale })
      return true
    } catch {
      setPreferencias(anterior)
      setAviso({ lugar, tipo: 'error', texto: 'No pudimos guardar este cambio. Probá de nuevo.' })
      return false
    }
  }

  async function alternarHerramienta(herramienta: string): Promise<void> {
    if (!preferencias) return
    const tiene = preferencias.herramientasDisponibles.includes(herramienta)
    const lista = tiene
      ? preferencias.herramientasDisponibles.filter((cada) => cada !== herramienta)
      : [...preferencias.herramientasDisponibles, herramienta]
    await guardar({ herramientasDisponibles: lista }, 'herramientas')
  }

  async function guardarClave(): Promise<void> {
    // Se sacan los espacios de los costados: pegar una clave arrastra un salto de
    // línea casi siempre, y después el error es imposible de ver.
    const limpia = clave.trim()
    if (limpia === '') {
      // Antes esto no hacía nada y no decía nada, que es la peor combinación: la
      // persona toca, no pasa nada, y no sabe si la app está rota o si se equivocó.
      setAviso({
        lugar: 'clave',
        tipo: 'error',
        texto: 'Pegá una clave primero. Si ya no querés usar la IA, tocá «Borrar la clave».',
      })
      campoClave.current?.focus()
      return
    }

    // Lo pegado se borra del campo solo si quedó guardado: si falla, sigue ahí para
    // volver a intentar sin tener que buscar la clave de nuevo.
    if (await guardar({ claveDeIa: limpia }, 'clave', 'Listo, la clave quedó guardada en este teléfono.')) {
      setClave('')
    }
  }

  async function borrarClave(): Promise<void> {
    const confirmado = await confirmar({
      titulo: '¿Borrar la clave?',
      texto: 'Se borra de este teléfono y dejás de poder pedir ideas. Para volver a usarla vas a tener que pegarla de nuevo.',
      confirmar: 'Borrar la clave',
      destructiva: true,
    })
    if (!confirmado) return

    if (await guardar({ claveDeIa: null }, 'clave', 'Listo, borramos la clave de este teléfono.')) {
      setClave('')
    }
  }

  async function probarClave(): Promise<void> {
    if (probando) return
    const limpia = clave.trim()
    if (limpia === '') {
      setAviso({
        lugar: 'clave',
        tipo: 'error',
        texto: 'Escribí la clave en el campo de arriba y después tocá «Probar».',
      })
      campoClave.current?.focus()
      return
    }

    setProbando(true)
    setAviso(null)
    try {
      // Un pedido de una palabra: alcanza para saber si la clave sirve, y gasta lo
      // mínimo de la cuota gratuita de la persona.
      const respuesta = await consultarIa({ clave: limpia, texto: 'Contestá solamente: listo', imagen: null })
      setAviso({ lugar: 'clave', tipo: 'listo', texto: `La clave funciona. La IA contestó «${respuesta.slice(0, 40)}».` })
    } catch (falla) {
      setAviso({
        lugar: 'clave',
        tipo: 'error',
        texto: falla instanceof FalloDeIa ? falla.message : 'No pudimos probar la clave.',
      })
    } finally {
      setProbando(false)
    }
  }

  async function guardarCopia(): Promise<void> {
    setAviso(null)
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
      setAviso({ lugar: 'datos', tipo: 'listo', texto: 'Listo, la copia se bajó a tu teléfono.' })
    } catch {
      setAviso({ lugar: 'datos', tipo: 'error', texto: 'No pudimos armar la copia. Probá de nuevo.' })
    }
  }

  async function traerCopia(archivo: File): Promise<void> {
    setAviso(null)
    try {
      const respaldo = leerRespaldo(await archivo.text())
      await repositorio.importar(respaldo)
      setAviso({
        lugar: 'datos',
        tipo: 'listo',
        texto: 'Listo, se sumó todo lo que faltaba. Nada de lo que tenías se perdió.',
      })
    } catch (falla) {
      // Si el archivo está mal, se dice por qué. «Error al importar» no le sirve
      // a nadie que acaba de elegir el archivo equivocado.
      setAviso({
        lugar: 'datos',
        tipo: 'error',
        texto: falla instanceof RespaldoInvalido ? falla.message : 'No pudimos leer el archivo.',
      })
    }
  }

  async function empezarDeCero(): Promise<void> {
    const confirmado = await confirmar({
      titulo: '¿Empezar de cero en este teléfono?',
      texto:
        'Se borra todo: los ambientes, las tareas y los totales de «Lo que hiciste». No se puede deshacer. Si querés conservarlo, primero guardá una copia.',
      confirmar: 'Borrar todo',
      destructiva: true,
    })
    if (!confirmado) return

    setAviso(null)
    try {
      await repositorio.borrarTodo()
      setAviso({ lugar: 'cero', tipo: 'listo', texto: 'Listo, este teléfono quedó en cero.' })
    } catch {
      setAviso({ lugar: 'cero', tipo: 'error', texto: 'No pudimos borrar los datos. No se tocó nada: probá de nuevo.' })
    }
  }

  if (falloLaCarga) {
    return (
      <ErrorDeCarga
        titulo="Ajustes"
        alReintentar={() => {
          setFalloLaCarga(false)
          setIntento((previo) => previo + 1)
        }}
      />
    )
  }

  if (!preferencias) {
    return (
      <main className="pantalla">
        <h1 className="pantalla__titulo">Ajustes</h1>
        <Esqueleto forma="ajustes" />
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
        <AvisoEn lugar="herramientas" aviso={aviso} />
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
                  onChange={() => void guardar({ modoPorDefecto: opcion.valor }, 'modo')}
                />
                <span className="ficha__marca" aria-hidden="true" />
                <span className="ficha__texto">{opcion.nombre}</span>
              </label>
            </li>
          ))}
        </ul>
        <AvisoEn lugar="modo" aviso={aviso} />
      </fieldset>

      <form
        className="grupo"
        onSubmit={(evento) => {
          evento.preventDefault()
          void guardar(
            { playlistPropia: playlist.trim() === '' ? null : playlist.trim() },
            'playlist',
            playlist.trim() === '' ? 'Listo, sacamos tu playlist.' : 'Listo, la playlist quedó guardada.',
          )
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
          className="campo__entrada"
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
        <AvisoEn lugar="playlist" aviso={aviso} />
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
            onChange={(evento) =>
              void guardar(
                { avisoDePrivacidadAceptado: evento.target.checked },
                'clave',
                evento.target.checked ? 'Listo, ya podés cargar tu clave.' : 'Listo, la IA quedó apagada.',
              )
            }
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
          <div className="campo">
            <p className="menudo">Hay una clave guardada en este teléfono.</p>
            <button type="button" className="boton-secundario" onClick={() => void borrarClave()}>
              Borrar la clave…
            </button>
          </div>
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
            ref={campoClave}
            id="clave-ia"
            name="clave-ia"
            className="campo__entrada"
            aria-invalid={aviso?.lugar === 'clave' && aviso.tipo === 'error'}
            aria-describedby="clave-ia-aviso"
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
              disabled={!preferencias.avisoDePrivacidadAceptado || probando}
              aria-busy={probando}
            >
              {probando ? 'Probando…' : 'Probar'}
            </button>
          </div>
          <AvisoEn lugar="clave" aviso={aviso} id="clave-ia-aviso" />
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
                  onChange={() => void guardar({ estiloDeReloj: opcion.valor }, 'reloj')}
                />
                <span className="ficha__marca" aria-hidden="true" />
                <span className="ficha__texto">{opcion.nombre}</span>
              </label>
            </li>
          ))}
        </ul>
        <AvisoEn lugar="reloj" aviso={aviso} />
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

        <SelectorDeArchivo
          id="copia"
          etiqueta="Traer de otra copia…"
          accept="application/json,.json"
          alElegir={(archivo) => void traerCopia(archivo)}
        />
        <AvisoEn lugar="datos" aviso={aviso} />
      </section>

      {/*
        La acción más destructiva de la app, aparte y con su propio estilo: antes era
        un botón más entre «Guardar una copia» y «Traer de otra copia».
      */}
      <section className="grupo zona-delicada">
        <h2 className="grupo__titulo">Empezar de cero</h2>
        <p className="menudo">Borra todo lo de este teléfono. Antes te pedimos que lo confirmes.</p>
        <button type="button" className="boton-destructivo" onClick={() => void empezarDeCero()}>
          Empezar de cero en este teléfono…
        </button>
        <AvisoEn lugar="cero" aviso={aviso} />
      </section>

      <div className="pantalla__pie">
        <Link className="boton-principal" to="/">
          Volver al principio
        </Link>
      </div>
    </main>
  )
}
