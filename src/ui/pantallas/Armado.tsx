import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ambientePorId, objetoPorId, objetosDeAmbiente, tareasDeAmbiente } from '../../domain/catalogo'
import { nuevoId } from '../id'
import { armarPedido, leerSugerencias } from '../../domain/ia'
import { consultarIa, FalloDeIa, leerImagen } from '../../data/iaCliente'
import type { Sugerencia } from '../../domain/ia'
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
  const [iaTexto, setIaTexto] = useState('')
  const [iaFoto, setIaFoto] = useState<File | null>(null)
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([])
  const [elegidas, setElegidas] = useState<number[]>([])
  const [pensando, setPensando] = useState(false)
  const [iaError, setIaError] = useState<string | null>(null)

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

  /*
    La IA propone, la persona decide.

    Nada de lo que devuelve el modelo entra en la lista por su cuenta: se muestra con
    una tilde puesta —porque si pidió ideas es porque las quiere— y recién cuando
    toca «Agregar las elegidas» se convierten en tareas.
  */
  async function pedirIdeas(): Promise<void> {
    setIaError(null)
    setPensando(true)
    try {
      const { claveDeIa, avisoDePrivacidadAceptado } = await repositorio.preferencias()
      if (!claveDeIa || !avisoDePrivacidadAceptado) {
        setIaError('Para pedir ideas primero hay que configurar la clave y aceptar el aviso, en Ajustes.')
        return
      }

      const imagen = iaFoto ? await leerImagen(iaFoto) : null
      const pedido = armarPedido({
        ambiente: ambiente?.nombre ?? 'este ambiente',
        yaIncluidas: conocidas
          .filter((tarea) => incluidas.includes(tarea.id))
          .map((tarea) => `${tarea.accion} ${tarea.descripcion}`.trim()),
        descripcion: iaTexto.trim() === '' ? null : iaTexto.trim(),
        hayFoto: imagen !== null,
      })

      const respuesta = await consultarIa({ clave: claveDeIa, texto: pedido, imagen })
      const leidas = leerSugerencias(respuesta)
      setSugerencias(leidas)
      setElegidas(leidas.map((_, indice) => indice))

      if (leidas.length === 0) {
        setIaError('La IA no propuso nada que se pueda usar. Probá contando un poco más.')
      }
    } catch (falla) {
      setIaError(falla instanceof FalloDeIa ? falla.message : 'No pudimos pedir ideas.')
    } finally {
      setPensando(false)
    }
  }

  async function agregarSugerencias(): Promise<void> {
    for (const indice of elegidas) {
      const sugerencia = sugerencias[indice]
      if (!sugerencia) continue

      const tarea: Tarea = {
        id: `ia-${nuevoId()}`,
        ambienteId,
        subAmbienteId: null,
        objetoId: null,
        verbo: sugerencia.verbo,
        accion: sugerencia.accion,
        descripcion: sugerencia.descripcion,
        duracionMin: sugerencia.duracionMin,
        // Una idea de la IA no viene con esfuerzo ni impacto medidos, así que se
        // asume el medio: no se le inventa un dato que después ordena el plan.
        esfuerzo: 2,
        impactoVisual: 2,
        requiere: [],
        herramientas: [],
        esDelCatalogo: false,
        notas: 'Sugerida por la IA.',
      }

      await repositorio.guardarTarea(tarea)
      setConocidas((previas) => [...previas, tarea])
      setIncluidas((previas) => [...previas, tarea.id])
    }

    setSugerencias([])
    setElegidas([])
    setIaTexto('')
    setIaFoto(null)
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
        <section className="grupo">
          <h2 className="pantalla__titulo">¿No sabés por dónde empezar?</h2>
          <p className="menudo">
            Contá lo que ves, o sacale una foto, y la IA te tira ideas. Vos elegís cuáles quedan.
          </p>

          <label className="menudo" htmlFor="ia-texto">
            Contá lo que ves
          </label>
          <textarea
            id="ia-texto"
            name="ia-texto"
            rows={3}
            value={iaTexto}
            placeholder="Ejemplo: hay ropa tirada y la mesada llena de cosas…"
            onChange={(evento) => setIaTexto(evento.target.value)}
          />

          <label className="menudo" htmlFor="ia-foto">
            O sacale una foto
          </label>
          <input
            id="ia-foto"
            name="ia-foto"
            type="file"
            accept="image/*"
            onChange={(evento) => setIaFoto(evento.target.files?.[0] ?? null)}
          />

          <button type="button" className="boton-secundario" onClick={() => void pedirIdeas()} aria-busy={pensando}>
            {pensando ? 'Pensando…' : 'Pedir ideas'}
          </button>

          {iaError && (
            <p className="alerta" role="status" aria-live="polite">
              {iaError}
            </p>
          )}

          {sugerencias.length > 0 && (
            <ul className="fichas fichas--una-columna">
              {sugerencias.map((sugerencia, indice) => (
                <li key={`${sugerencia.accion}-${indice}`} className="tarea">
                  <label className="ficha" htmlFor={`idea-${indice}`}>
                    <input
                      id={`idea-${indice}`}
                      type="checkbox"
                      className="ficha__entrada"
                      checked={elegidas.includes(indice)}
                      onChange={() =>
                        setElegidas((previas) =>
                          previas.includes(indice) ? previas.filter((cada) => cada !== indice) : [...previas, indice],
                        )
                      }
                    />
                    <span className="ficha__marca" aria-hidden="true" />
                    <span className="ficha__texto">
                      {`${sugerencia.accion} ${sugerencia.descripcion}`.trim()}
                      <span className="menudo">{sugerencia.duracionMin}&nbsp;min</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          {sugerencias.length > 0 && (
            <button type="button" className="boton-secundario" onClick={() => void agregarSugerencias()}>
              Agregar las elegidas
            </button>
          )}

          <Link className="menudo" to="/ajustes">
            Configurar la IA
          </Link>
        </section>

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
