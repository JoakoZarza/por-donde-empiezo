import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { generarPlan } from '../../domain/motor/generarPlan'
import { opcionesDeMusica } from '../musica'
import { nuevoId } from '../id'
import { useSesion } from '../estado/sesion'
import { useTitulo } from '../estado/useTitulo'
import ErrorDeCarga from '../componentes/ErrorDeCarga'
import type { Modo, Tarea } from '../../domain/tipos'

/*
  El arranque de la sesión: cuánto tiempo hay y con qué criterio ordenar.

  Es la FRONTERA IMPURA del motor: acá, y solo acá, se consulta el reloj y se
  inventa el identificador del plan.

  El estado de las tareas distingue TRES casos, y no dos. Contar solo las tareas
  guardadas hacía que, con todo ya hecho, el botón quedara habilitado, el plan
  saliera vacío y la persona quedara en un bucle sin salida: en una app instalada
  no hay botón Atrás. Lo encontró la revisión final de la rama.
*/

const TIEMPOS = [
  { valor: '10', minutos: 10, etiqueta: '10 minutos' },
  { valor: '20', minutos: 20, etiqueta: '20 minutos' },
  { valor: '30', minutos: 30, etiqueta: '30 minutos' },
  { valor: '60', minutos: 60, etiqueta: '60 minutos' },
  { valor: 'sinLimite', minutos: null, etiqueta: 'Sin límite' },
] as const

const MODOS: { valor: Modo; nombre: string; explicacion: string }[] = [
  {
    valor: 'arrancarYa',
    nombre: 'Arrancar ya',
    explicacion: 'Una victoria rápida primero, y después lo que más se nota.',
  },
  {
    valor: 'ambientePorAmbiente',
    nombre: 'Ambiente por ambiente',
    explicacion: 'Terminás un ambiente entero antes de pasar al siguiente.',
  },
  {
    valor: 'puestaAPunto',
    nombre: 'Puesta a punto',
    explicacion: 'La casa entera, en orden de recorrido, con el piso al final.',
  },
]

type EstadoDeTareas = 'cargando' | 'falloLaCarga' | 'sinTareas' | 'todoHecho' | 'hayTareas'

export default function ArranqueSesion() {
  const navegar = useNavigate()
  const repositorio = useSesion((estado) => estado.repositorio)
  const abrirPlan = useSesion((estado) => estado.abrirPlan)

  const [tiempo, setTiempo] = useState<string>('20')
  const [modo, setModo] = useState<Modo>('arrancarYa')
  const [playlist, setPlaylist] = useState<string | null>(null)
  /** Si la persona tocó el tiempo a mano, la preferencia ya no manda. */
  const [tiempoTocado, setTiempoTocado] = useState(false)
  const [estadoDeTareas, setEstadoDeTareas] = useState<EstadoDeTareas>('cargando')
  const [armando, setArmando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  useTitulo('¿Cuánto tiempo tenés?')

  const minutosElegidos = TIEMPOS.find((opcion) => opcion.valor === tiempo)?.minutos ?? null

  useEffect(() => {
    let vigente = true

    async function mirar(): Promise<void> {
      const ambientes = await repositorio.listarAmbientes()
      let guardadas = 0
      let pendientes = 0

      for (const ambiente of ambientes) {
        const hechas = new Set(await repositorio.listarHechas(ambiente.id))
        const tareas = await repositorio.listarTareas(ambiente.id)
        guardadas += tareas.length
        pendientes += tareas.filter((tarea) => !hechas.has(tarea.id)).length
      }

      const { modoPorDefecto, playlistPropia, duracionRetoPreferida } = await repositorio.preferencias()

      if (!vigente) return
      // Las preferencias se aplican acá: son las tres que hasta ahora existían sin que
      // ninguna pantalla las leyera.
      setModo(modoPorDefecto)
      setPlaylist(playlistPropia)

      // La duración preferida viene marcada, salvo que la persona ya haya elegido otra
      // cosa a mano en esta pantalla.
      if (!tiempoTocado) {
        const opcion = TIEMPOS.find((cada) => cada.minutos === duracionRetoPreferida)
        setTiempo(opcion ? opcion.valor : 'sinLimite')
      }
      if (guardadas === 0) setEstadoDeTareas('sinTareas')
      else if (pendientes === 0) setEstadoDeTareas('todoHecho')
      else setEstadoDeTareas('hayTareas')
    }

    mirar().catch(() => {
      if (vigente) setEstadoDeTareas('falloLaCarga')
    })
    return () => {
      vigente = false
    }
  }, [repositorio, revision])

  /**
   * «Arrancar de nuevo»: abre un ciclo nuevo en todos los ambientes guardados, para
   * que sus tareas vuelvan a estar pendientes. Sin esto, quien terminó todo queda
   * sin forma de volver a empezar, y en una app instalada no hay botón Atrás.
   */
  async function empezarDeNuevo(): Promise<void> {
    setEstadoDeTareas('cargando')
    setError(null)
    try {
      const ambientes = await repositorio.listarAmbientes()
      for (const ambiente of ambientes) {
        await repositorio.limpiarHechas(ambiente.id)
      }
    } catch {
      setError('No pudimos arrancar de nuevo. Probá otra vez.')
    }
    // Se vuelve a mirar igual: si falló a mitad de camino, la pantalla muestra lo que
    // de verdad quedó guardado y no lo que se esperaba.
    setRevision((previa) => previa + 1)
  }

  function reintentar(): void {
    setEstadoDeTareas('cargando')
    setRevision((previa) => previa + 1)
  }

  async function armar(): Promise<void> {
    setArmando(true)
    try {
      const ambientes = await repositorio.listarAmbientes()
      const tareas: Tarea[] = []
      const hechasEnCiclo: string[] = []

      for (const ambiente of ambientes) {
        tareas.push(...(await repositorio.listarTareas(ambiente.id)))
        hechasEnCiclo.push(...(await repositorio.listarHechas(ambiente.id)))
      }

      const minutos = TIEMPOS.find((opcion) => opcion.valor === tiempo)?.minutos ?? null
      const preferencias = await repositorio.preferencias()
      const { herramientasDisponibles } = preferencias

      /*
        La duración elegida se guarda como preferencia. Así la próxima vez viene
        marcada la que la persona realmente usa, sin tener que configurarla en otro
        lado —que es justamente lo que faltaba: la preferencia existía y nadie la
        escribía ni la leía—.
      */
      if (minutos !== null && minutos !== preferencias.duracionRetoPreferida) {
        await repositorio.guardarPreferencias({ ...preferencias, duracionRetoPreferida: minutos })
      }
      const idPlan = nuevoId()

      const { plan } = generarPlan(
        { ambientes, tareas, hechasEnCiclo, presupuestoMin: minutos, modo, herramientasDisponibles },
        new Date().toISOString(),
        idPlan,
      )

      await repositorio.guardarPlan(plan)
      abrirPlan(plan)
      navegar(`/plan/${idPlan}`)
    } catch {
      setError('No pudimos armar el plan. Probá de nuevo.')
    } finally {
      setArmando(false)
    }
  }

  if (estadoDeTareas === 'falloLaCarga') {
    return <ErrorDeCarga titulo="¿Cuánto tiempo tenés?" alReintentar={reintentar} />
  }

  return (
    <main className="pantalla">
      <h1 className="pantalla__titulo">¿Cuánto tiempo tenés?</h1>

      <fieldset className="grupo">
        <legend className="menudo">Tiempo disponible</legend>
        <ul className="fichas">
          {TIEMPOS.map((opcion) => (
            <li key={opcion.valor}>
              <label
                htmlFor={`tiempo-${opcion.valor}`}
                className={tiempo === opcion.valor ? 'ficha ficha--elegida' : 'ficha'}
              >
                <input
                  id={`tiempo-${opcion.valor}`}
                  type="radio"
                  name="tiempo"
                  value={opcion.valor}
                  className="ficha__entrada"
                  checked={tiempo === opcion.valor}
                  onChange={() => {
                    setTiempo(opcion.valor)
                    setTiempoTocado(true)
                  }}
                />
                <span className="ficha__marca" aria-hidden="true" />
                <span className="ficha__texto">{opcion.etiqueta}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="grupo">
        <p className="menudo">Poné algo y arrancamos</p>
        <ul className="musica">
          {opcionesDeMusica(minutosElegidos, playlist).map((opcion) => (
            <li key={opcion.nombre}>
              <a className="boton-secundario" href={opcion.url} rel="noreferrer">
                {opcion.nombre}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <fieldset className="grupo">
        <legend className="menudo">Cómo lo ordenamos</legend>
        <ul className="fichas fichas--una-columna">
          {MODOS.map((opcion) => (
            <li key={opcion.valor}>
              <label
                htmlFor={`modo-${opcion.valor}`}
                className={modo === opcion.valor ? 'ficha ficha--elegida' : 'ficha'}
              >
                <input
                  id={`modo-${opcion.valor}`}
                  type="radio"
                  name="modo"
                  value={opcion.valor}
                  className="ficha__entrada"
                  checked={modo === opcion.valor}
                  onChange={() => setModo(opcion.valor)}
                />
                <span className="ficha__marca" aria-hidden="true" />
                <span className="ficha__texto">
                  {opcion.nombre}
                  <span className="menudo">{opcion.explicacion}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="pantalla__pie">
        {estadoDeTareas === 'sinTareas' && (
          <>
            <p className="menudo">No hay ninguna tarea para hacer.</p>
            <Link className="boton-secundario" to="/">
              Elegir ambientes
            </Link>
          </>
        )}

        {estadoDeTareas === 'todoHecho' && (
          <>
            <p className="menudo">Ya hiciste todo lo de estos ambientes. ¿Arrancamos de nuevo?</p>
            <button type="button" className="boton-secundario" onClick={() => void empezarDeNuevo()}>
              Arrancar de nuevo
            </button>
            <Link className="boton-secundario" to="/">
              Volver al principio
            </Link>
          </>
        )}

        {error && (
          <p className="alerta" role="status" aria-live="polite">
            {error}
          </p>
        )}

        <button
          type="button"
          className="boton-principal"
          onClick={() => void armar()}
          disabled={estadoDeTareas !== 'hayTareas' || armando}
          aria-busy={armando}
        >
          Armá el plan
        </button>
      </div>
    </main>
  )
}
