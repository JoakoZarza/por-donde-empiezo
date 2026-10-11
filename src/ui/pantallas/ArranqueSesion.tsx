import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { generarPlan } from '../../domain/motor/generarPlan'
import { useSesion } from '../estado/sesion'
import { useTitulo } from '../estado/useTitulo'
import type { Modo, Tarea } from '../../domain/tipos'

/*
  El arranque de la sesión: cuánto tiempo hay y con qué criterio ordenar.

  Es la FRONTERA IMPURA del motor: acá, y solo acá, se consulta el reloj y se
  inventa el identificador del plan. `generarPlan` los recibe por parámetro, y por
  eso su resultado es reproducible y comprobable.
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

export default function ArranqueSesion() {
  const navegar = useNavigate()
  const repositorio = useSesion((estado) => estado.repositorio)
  const abrirPlan = useSesion((estado) => estado.abrirPlan)

  const [tiempo, setTiempo] = useState<string>('20')
  const [modo, setModo] = useState<Modo>('arrancarYa')
  const [hayTareas, setHayTareas] = useState<boolean | null>(null)
  const [armando, setArmando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useTitulo('¿Cuánto tiempo tenés?')

  useEffect(() => {
    let vigente = true

    async function mirar(): Promise<void> {
      const ambientes = await repositorio.listarAmbientes()
      let total = 0
      for (const ambiente of ambientes) {
        total += (await repositorio.listarTareas(ambiente.id)).length
      }
      if (vigente) setHayTareas(total > 0)
    }

    void mirar()
    return () => {
      vigente = false
    }
  }, [repositorio])

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

      const { herramientasDisponibles } = await repositorio.preferencias()
      const minutos = TIEMPOS.find((opcion) => opcion.valor === tiempo)?.minutos ?? null
      const idPlan = crypto.randomUUID()

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

  return (
    <main className="pantalla">
      <h1 className="pantalla__titulo">¿Cuánto tiempo tenés?</h1>

      <fieldset className="grupo">
        <legend className="menudo">Tiempo disponible</legend>
        <ul className="fichas">
          {TIEMPOS.map((opcion) => (
            <li key={opcion.valor}>
              <label htmlFor={`tiempo-${opcion.valor}`} className={tiempo === opcion.valor ? 'ficha ficha--elegida' : 'ficha'}>
                <input
                  id={`tiempo-${opcion.valor}`}
                  type="radio"
                  name="tiempo"
                  value={opcion.valor}
                  className="ficha__entrada"
                  checked={tiempo === opcion.valor}
                  onChange={() => setTiempo(opcion.valor)}
                />
                <span className="ficha__marca" aria-hidden="true" />
                <span className="ficha__texto">{opcion.etiqueta}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset className="grupo">
        <legend className="menudo">Cómo lo ordenamos</legend>
        <ul className="fichas fichas--una-columna">
          {MODOS.map((opcion) => (
            <li key={opcion.valor}>
              <label htmlFor={`modo-${opcion.valor}`} className={modo === opcion.valor ? 'ficha ficha--elegida' : 'ficha'}>
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
        {hayTareas === false && <p className="menudo">No hay ninguna tarea para hacer. Volvé y elegí un ambiente.</p>}
        {error && (
          <p className="alerta" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          className="boton-principal"
          onClick={() => void armar()}
          disabled={hayTareas !== true || armando}
          aria-busy={armando}
        >
          Armá el plan
        </button>
      </div>
    </main>
  )
}
