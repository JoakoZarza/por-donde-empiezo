import { useState } from 'react'
import { useNavigate } from 'react-router'
import { CATALOGO } from '../../domain/catalogo'
import { useSesion } from '../estado/sesion'
import { useTitulo } from '../estado/useTitulo'

/*
  La primera pantalla. Sin registro, sin tutorial, sin carrusel de bienvenida:
  ocho ambientes y un botón.

  La ficha entera es el blanco de toque, no solo el círculo: en un celular, con el
  pulgar y a las apuradas, apuntarle a una casilla chica es la diferencia entre
  seguir y abandonar.
*/
export default function PrimeraVez() {
  const navegar = useNavigate()
  const elegirAmbientes = useSesion((estado) => estado.elegirAmbientes)
  const [elegidos, setElegidos] = useState<string[]>([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useTitulo('¿Qué querés ordenar?')

  function alternar(ambienteId: string): void {
    setElegidos((previos) =>
      previos.includes(ambienteId) ? previos.filter((id) => id !== ambienteId) : [...previos, ambienteId],
    )
  }

  async function avanzar(): Promise<void> {
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
        {elegidos.length === 0 && <p className="menudo">Elegí al menos un ambiente.</p>}
        {error && (
          <p className="alerta" role="status" aria-live="polite">
            {error}
          </p>
        )}
        <button
          type="button"
          className="boton-principal"
          onClick={avanzar}
          disabled={elegidos.length === 0}
          aria-busy={guardando}
        >
          Armá las tareas
        </button>
      </div>
    </main>
  )
}
