import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ambientePorId, objetoPorId, objetosDeAmbiente, tareasDeAmbiente } from '../../domain/catalogo'
import { nuevoId } from '../id'
import { useSesion } from '../estado/sesion'
import { useTitulo } from '../estado/useTitulo'
import type { Ambiente, Tarea } from '../../domain/tipos'

/*
  El armado del ambiente.

  Lo que está guardado en el teléfono ES la lista de lo incluido: no hay un campo
  «incluida» aparte, que podría quedar desincronizado con la lista. Destildar
  borra; volver a tildar devuelve.

  Las tareas se agrupan por el nombre del objeto sobre el que se trabaja, porque
  «Mesada» dice más que una lista plana de nueve verbos.
*/

const GRUPO_PROPIAS = 'propias'

export default function Armado() {
  const { ambienteId = '' } = useParams()
  const navegar = useNavigate()
  const repositorio = useSesion((estado) => estado.repositorio)
  const [conocidas, setConocidas] = useState<Tarea[]>([])
  const [incluidas, setIncluidas] = useState<string[]>([])
  const [siguiente, setSiguiente] = useState<Ambiente | null>(null)
  const [propia, setPropia] = useState('')
  const [error, setError] = useState<string | null>(null)

  const ambiente = ambientePorId(ambienteId)
  useTitulo(ambiente?.nombre ?? 'Armar el ambiente')

  useEffect(() => {
    let vigente = true

    async function cargar(): Promise<void> {
      const delCatalogo = tareasDeAmbiente(ambienteId)
      let guardadas = await repositorio.listarTareas(ambienteId)

      /*
        La siembra del catálogo corresponde solo si la persona todavía no eligió este
        ambiente. Con la condición «no hay tareas guardadas» alcanzaba con destildar
        todas y volver —con el botón Atrás, o recargando— para que reaparecieran todas
        y entraran al plan: su decisión se revertía en silencio.
      */
      const yaElegido = (await repositorio.listarAmbientes()).some((otro) => otro.id === ambienteId)

      if (!yaElegido && guardadas.length === 0 && delCatalogo.length > 0 && ambiente) {
        await repositorio.guardarAmbiente(ambiente)
        for (const tarea of delCatalogo) await repositorio.guardarTarea(tarea)
        guardadas = delCatalogo
      }

      if (!vigente) return

      // `conocidas` guarda también las destildadas, para poder volver a tildarlas.
      const porId = new Map<string, Tarea>()
      for (const tarea of [...delCatalogo, ...guardadas]) porId.set(tarea.id, tarea)
      setConocidas([...porId.values()])
      setIncluidas(guardadas.map((tarea) => tarea.id))

      // Los ambientes que faltan armar, en orden de recorrido.
      const pendientes = (await repositorio.listarAmbientes())
        .filter(
          (otro) =>
            otro.id !== ambienteId && otro.ordenRecorrido > (ambiente?.ordenRecorrido ?? Number.MAX_SAFE_INTEGER),
        )
        .sort((a, b) => a.ordenRecorrido - b.ordenRecorrido)
      if (vigente) setSiguiente(pendientes[0] ?? null)
    }

    void cargar()
    return () => {
      vigente = false
    }
  }, [ambienteId, ambiente, repositorio])

  const grupos = useMemo(() => {
    const ordenDeObjetos = new Map(objetosDeAmbiente(ambienteId).map((objeto, indice) => [objeto.id, indice]))
    const porGrupo = new Map<string, Tarea[]>()

    for (const tarea of conocidas) {
      const clave = tarea.objetoId ?? GRUPO_PROPIAS
      porGrupo.set(clave, [...(porGrupo.get(clave) ?? []), tarea])
    }

    return [...porGrupo.entries()]
      .map(([clave, tareas]) => ({
        clave,
        nombre: objetoPorId(clave)?.nombre ?? 'Tus propias',
        tareas,
        orden: ordenDeObjetos.get(clave) ?? Number.MAX_SAFE_INTEGER,
      }))
      .sort((a, b) => (a.orden !== b.orden ? a.orden - b.orden : a.clave.localeCompare(b.clave)))
  }, [conocidas, ambienteId])

  async function alternar(tarea: Tarea): Promise<void> {
    const incluida = incluidas.includes(tarea.id)

    /*
      Actualización optimista: la casilla responde al toque, no a la base de datos.
      Si se esperara a IndexedDB, en un celular real la interfaz se sentiría lenta
      con cada tilde. Si el guardado falla, se revierte y se avisa.
    */
    setIncluidas((previas) =>
      incluida ? previas.filter((id) => id !== tarea.id) : [...previas, tarea.id],
    )

    try {
      if (incluida) {
        await repositorio.eliminarTarea(tarea.id)
      } else {
        await repositorio.guardarTarea(tarea)
      }
    } catch {
      setIncluidas((previas) =>
        incluida ? [...previas, tarea.id] : previas.filter((id) => id !== tarea.id),
      )
      setError('No pudimos guardar el cambio. Probá de nuevo.')
    }
  }

  async function agregar(): Promise<void> {
    const texto = propia.trim()
    if (texto === '') {
      setError('Escribí qué hay que hacer.')
      return
    }

    // Una tarea propia es una sola frase: va entera en la acción, que es lo que la
    // pantalla del plan muestra en grande, y la descripción queda vacía.
    const tarea: Tarea = {
      id: `propia-${nuevoId()}`,
      ambienteId,
      subAmbienteId: null,
      objetoId: null,
      verbo: 'limpiar',
      accion: texto,
      descripcion: '',
      duracionMin: 5,
      esfuerzo: 1,
      impactoVisual: 1,
      requiere: [],
      herramientas: [],
      esDelCatalogo: false,
      notas: null,
    }

    await repositorio.guardarTarea(tarea)
    setConocidas((previas) => [...previas, tarea])
    setIncluidas((previas) => [...previas, tarea.id])
    setPropia('')
    setError(null)
  }

  return (
    <main className="pantalla">
      <h1 className="pantalla__titulo">{ambiente?.nombre ?? 'Ambiente'}</h1>
      <p className="menudo">Esto es lo que solemos hacer acá. Destildá lo que no quieras.</p>

      {grupos.map((grupo) => (
        <section key={grupo.clave} className="grupo">
          <h2 className="grupo__titulo">{grupo.nombre}</h2>
          <ul className="tareas">
            {grupo.tareas.map((tarea) => (
              <li key={tarea.id}>
                <label className="tarea">
                  <input
                    type="checkbox"
                    className="tarea__entrada"
                    checked={incluidas.includes(tarea.id)}
                    onChange={() => void alternar(tarea)}
                  />
                  <span className="ficha__marca" aria-hidden="true" />
                  <span className="tarea__texto">
                    {tarea.accion}
                    {tarea.descripcion ? ` ${tarea.descripcion}` : ''}
                  </span>
                  <span className="tarea__minutos tabular">{tarea.duracionMin}&nbsp;min</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="pantalla__pie">
        <label className="campo__etiqueta" htmlFor="tarea-propia">
          Agregar algo mío
        </label>
        <input
          id="tarea-propia"
          className="campo__entrada"
          value={propia}
          placeholder="regar las plantas…"
          onChange={(evento) => {
            setPropia(evento.target.value)
            setError(null)
          }}
        />
        {error && (
          <p className="alerta" role="status" aria-live="polite">
            {error}
          </p>
        )}
        <button type="button" className="boton-secundario" onClick={() => void agregar()}>
          Agregar
        </button>

        {/*
          Sin estos botones el flujo queda cortado: se puede armar el ambiente pero
          no hay forma de llegar a la pantalla del tiempo sin escribir la dirección
          a mano. Lo destapó la prueba de flujo completo, no los tests de pantalla.
        */}
        {siguiente ? (
          <>
            <button type="button" className="boton-secundario" onClick={() => navegar('/sesion/nueva')}>
              Listo, ¿cuánto tiempo tengo?
            </button>
            <button
              type="button"
              className="boton-principal"
              onClick={() => navegar(`/armar/${siguiente.id}`)}
            >
              Seguir con {siguiente.nombre.toLowerCase()}
            </button>
          </>
        ) : (
          <button type="button" className="boton-principal" onClick={() => navegar('/sesion/nueva')}>
            Listo, ¿cuánto tiempo tengo?
          </button>
        )}
      </div>
    </main>
  )
}
