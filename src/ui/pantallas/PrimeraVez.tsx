import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import Bienvenida from '../componentes/Bienvenida'
import { CATALOGO } from '../../domain/catalogo'
import { useSesion } from '../estado/sesion'
import { useTitulo } from '../estado/useTitulo'
import BotonConCarga from '../componentes/BotonConCarga'

/*
  La primera pantalla. Sin registro, sin tutorial, sin carrusel de bienvenida:
  ocho ambientes y un botón.

  La ficha entera es el blanco de toque, no solo el círculo: en un celular, con el
  pulgar y a las apuradas, apuntarle a una casilla chica es la diferencia entre
  seguir y abandonar.
*/
export default function PrimeraVez() {
  const navegar = useNavigate()
  const repositorio = useSesion((estado) => estado.repositorio)
  const elegirAmbientes = useSesion((estado) => estado.elegirAmbientes)
  const [elegidos, setElegidos] = useState<string[]>([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Si la persona ya tocó una ficha, lo que llegue del teléfono no la pisa. */
  const tocado = useRef(false)
  /** Nadie eligió nada todavía en este teléfono: es la primera vez. */
  const [esNueva, setEsNueva] = useState(false)

  useTitulo('¿Qué querés ordenar?')

  /*
    Quien vuelve encuentra tildados los ambientes que ya había elegido. Antes la
    pantalla arrancaba siempre vacía, justo debajo de un saludo que decía «Está todo
    donde lo dejaste»: la app se contradecía en la primera pantalla.

    Si no se puede leer, se arranca vacío como antes: no vale bloquear la pantalla
    de entrada por una comodidad.
  */
  useEffect(() => {
    let vigente = true
    repositorio
      .listarAmbientes()
      .then((guardados) => {
        if (!vigente) return
        setEsNueva(guardados.length === 0)
        if (!tocado.current) setElegidos(guardados.map((ambiente) => ambiente.id))
      })
      .catch(() => {})
    return () => {
      vigente = false
    }
  }, [repositorio])

  function alternar(ambienteId: string): void {
    tocado.current = true
    setElegidos((previos) =>
      previos.includes(ambienteId) ? previos.filter((id) => id !== ambienteId) : [...previos, ambienteId],
    )
  }

  async function avanzar(): Promise<void> {
    if (guardando) return
    setGuardando(true)
    setError(null)
    try {
      const primerAmbiente = await elegirAmbientes(elegidos)
      if (primerAmbiente) navegar(`/armar/${primerAmbiente}`)
    } catch {
      // Sin esto, la primera pantalla era la única que fallaba en silencio.
      setError('No pudimos guardar tus ambientes. Probá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <main className="pantalla">
      <h1 className="pantalla__titulo">¿Qué querés ordenar?</h1>
      {/*
        Para quien llega por primera vez, una línea que diga qué es esto. Antes la
        pantalla era un título y ocho fichas, sin ninguna pista de qué pasaba al
        elegir. Quien vuelve ya lo sabe, y no se la repetimos.
      */}
      {esNueva && (
        <p className="menudo">
          No tenés que ordenar todo, solo lo siguiente. Elegí uno o más ambientes y te armamos un plan corto, al
          ritmo del tiempo que tengas.
        </p>
      )}

      <ul className="fichas">
        {CATALOGO.ambientes.map((ambiente) => {
          const elegido = elegidos.includes(ambiente.id)
          return (
            <li key={ambiente.id}>
              <label className={elegido ? 'ficha ficha--elegida' : 'ficha'}>
                <input
                  type="checkbox"
                  className="ficha__entrada"
                  checked={elegido}
                  onChange={() => alternar(ambiente.id)}
                />
                <span className="ficha__marca" aria-hidden="true" />
                <span className="ficha__texto">{ambiente.nombre}</span>
              </label>
            </li>
          )
        })}
      </ul>

      <div className="pantalla__pie">
        <Bienvenida />
        {elegidos.length === 0 && <p className="menudo">Elegí al menos un ambiente.</p>}
        {error && (
          <p className="alerta" role="status" aria-live="polite">
            {error}
          </p>
        )}
        <BotonConCarga
          className="boton-principal"
          onClick={() => void avanzar()}
          disabled={elegidos.length === 0}
          cargando={guardando}
        >
          Armá las tareas
        </BotonConCarga>
      </div>
    </main>
  )
}
