import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { CATALOGO } from '../../domain/catalogo'
import { armarLaCasa } from '../../domain/casa'
import { useSesion } from '../estado/sesion'
import { useTitulo } from '../estado/useTitulo'
import ErrorDeCarga from '../componentes/ErrorDeCarga'
import type { Cuarto, EstadoDelAmbiente } from '../../domain/casa'
import type { Ambiente, Tarea } from '../../domain/tipos'

/*
  El plano de la casa.

  Es la pantalla que hace visible lo que la app viene haciendo por dentro: los
  cuartos se van encendiendo a medida que se ordenan. La luz es la metáfora de todo
  el diseño —el velador encendido en una casa a oscuras— y acá se ve entera.

  Cada cuarto dice su estado en palabras además de brillar. Nunca solo por color.
  Y tocar un cuarto lleva a sus tareas, que es lo que la persona quiere hacer
  después de ver que le falta.
*/

const ESTADO_EN_PALABRAS: Record<EstadoDelAmbiente, string> = {
  sinElegir: 'Sin elegir',
  sinEmpezar: 'Sin empezar',
  aMedias: 'A medias',
  alDia: 'Al día',
}

export default function Casa() {
  const repositorio = useSesion((estado) => estado.repositorio)
  const [cuartos, setCuartos] = useState<Cuarto[] | null>(null)
  const [falloLaCarga, setFalloLaCarga] = useState(false)
  const [intento, setIntento] = useState(0)

  useTitulo('Tu casa')

  useEffect(() => {
    let vigente = true

    void (async () => {
      try {
        const elegidos: Ambiente[] = await repositorio.listarAmbientes()
        const tareasPorAmbiente: Record<string, Tarea[]> = {}
        const hechasPorAmbiente: Record<string, string[]> = {}

        for (const ambiente of CATALOGO.ambientes) {
          tareasPorAmbiente[ambiente.id] = await repositorio.listarTareas(ambiente.id)
          hechasPorAmbiente[ambiente.id] = await repositorio.listarHechas(ambiente.id)
        }

        if (!vigente) return
        setCuartos(
          armarLaCasa({
            catalogo: CATALOGO.ambientes,
            elegidos,
            tareasPorAmbiente,
            hechasPorAmbiente,
          }),
        )
      } catch {
        if (vigente) setFalloLaCarga(true)
      }
    })()

    return () => {
      vigente = false
    }
  }, [repositorio, intento])

  function reintentar(): void {
    setFalloLaCarga(false)
    setIntento((previo) => previo + 1)
  }

  if (falloLaCarga) return <ErrorDeCarga titulo="Tu casa" alReintentar={reintentar} />

  if (!cuartos) {
    return (
      <main className="pantalla">
        <h1 className="pantalla__titulo">Tu casa</h1>
        <p className="menudo">Cargando…</p>
      </main>
    )
  }

  const encendidos = cuartos.filter((cuarto) => cuarto.estado === 'alDia').length
  const elegidos = cuartos.filter((cuarto) => cuarto.estado !== 'sinElegir').length

  return (
    <main className="pantalla">
      <h1 className="pantalla__titulo">Tu casa</h1>
      <p className="menudo">
        {elegidos === 0
          ? 'Todavía no elegiste ningún ambiente. El plano se va a ir encendiendo a medida que ordenes.'
          : `Elegiste ${elegidos} ${elegidos === 1 ? 'ambiente' : 'ambientes'} y ${encendidos === 1 ? 'hay 1 al día' : `hay ${encendidos} al día`}.`}
      </p>

      <ul className="casa">
        {cuartos.map((cuarto) => (
          <li key={cuarto.ambienteId}>
            <Link
              className={cuarto.estado === 'sinElegir' ? 'cuarto cuarto--apagado' : 'cuarto'}
              to={`/armar/${cuarto.ambienteId}`}
            >
              {/* La luz, detrás de todo. Decorativa: el estado va escrito abajo. */}
              <span className="cuarto__luz" style={{ opacity: cuarto.luz }} aria-hidden="true" />
              <span className="cuarto__nombre">{cuarto.nombre}</span>
              <span className="menudo">{ESTADO_EN_PALABRAS[cuarto.estado]}</span>
              {cuarto.estado === 'aMedias' && (
                <span className="menudo tabular">
                  {cuarto.hechas} de {cuarto.total}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      <div className="pantalla__pie">
        <Link className="boton-principal" to="/">
          Elegir ambientes
        </Link>
      </div>
    </main>
  )
}
