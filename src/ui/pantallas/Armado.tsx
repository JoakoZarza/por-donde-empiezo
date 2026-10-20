import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ambientePorId, objetoPorId, objetosDeAmbiente, tareasDeAmbiente } from '../../domain/catalogo'
import { nuevoId } from '../id'
import { armarPedido, avisoIaAceptado, leerSugerencias } from '../../domain/ia'
import { consultarIa, FalloDeIa, leerImagen } from '../../data/iaCliente'
import type { Sugerencia } from '../../domain/ia'
import { useSesion } from '../estado/sesion'
import { useTitulo } from '../estado/useTitulo'
import BotonConCarga from '../componentes/BotonConCarga'
import ErrorDeCarga from '../componentes/ErrorDeCarga'
import LamparaApagada from '../componentes/LamparaApagada'
import SelectorDeArchivo from '../componentes/SelectorDeArchivo'
import Esqueleto from '../componentes/Esqueleto'
import { useAvisos } from '../estado/avisos'
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

/*
  Topes de largo. Generosos —una tarea propia es una frase, no un párrafo— pero
  existen: sin tope, pegar un texto entero rompía la tarjeta del paso, y la
  descripción para la IA viaja en cada pedido y gasta cuota de la clave.
*/
const LARGO_MAXIMO_TAREA = 200
const LARGO_MAXIMO_DESCRIPCION = 1000

export default function Armado() {
  const { ambienteId = '' } = useParams()
  const navegar = useNavigate()
  const repositorio = useSesion((estado) => estado.repositorio)
  const [conocidas, setConocidas] = useState<Tarea[]>([])
  const [incluidas, setIncluidas] = useState<string[]>([])
  const [siguiente, setSiguiente] = useState<Ambiente | null>(null)
  const [propia, setPropia] = useState('')
  /*
    Dos errores, y no uno: el del campo «Agregar algo mío» va pegado al campo, y el
    de tildar va junto a la lista. Con uno solo, un fallo al tildar aparecía debajo
    del campo de texto y parecía culpa de lo que la persona había escrito.
  */
  const [errorPropia, setErrorPropia] = useState<string | null>(null)
  const [errorCambio, setErrorCambio] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [falloLaCarga, setFalloLaCarga] = useState(false)
  const [intento, setIntento] = useState(0)
  const [agregando, setAgregando] = useState(false)
  const campoPropia = useRef<HTMLInputElement>(null)
  const avisar = useAvisos((estado) => estado.avisar)
  const [iaTexto, setIaTexto] = useState('')
  const [iaFoto, setIaFoto] = useState<File | null>(null)
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([])
  const [elegidas, setElegidas] = useState<number[]>([])
  const [pensando, setPensando] = useState(false)
  const [iaError, setIaError] = useState<string | null>(null)

  const ambiente = ambientePorId(ambienteId)
  useTitulo(ambiente?.nombre ?? 'No encontramos ese ambiente')

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

    cargar()
      .then(() => {
        if (vigente) setCargando(false)
      })
      .catch(() => {
        if (vigente) {
          setFalloLaCarga(true)
          setCargando(false)
        }
      })
    return () => {
      vigente = false
    }
  }, [ambienteId, ambiente, repositorio, intento])

  function reintentar(): void {
    setFalloLaCarga(false)
    setCargando(true)
    setIntento((previo) => previo + 1)
  }

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
      setErrorCambio('No pudimos guardar el cambio. Probá de nuevo.')
    }
  }

  /*
    La IA propone, la persona decide.

    Nada de lo que devuelve el modelo entra en la lista por su cuenta: se muestra con
    una tilde puesta —porque si pidió ideas es porque las quiere— y recién cuando
    toca «Agregá las elegidas» se convierten en tareas.
  */
  async function pedirIdeas(): Promise<void> {
    // Un segundo toque mientras piensa mandaría otro pedido y gastaría cuota de la clave.
    if (pensando) return
    setIaError(null)
    setPensando(true)
    try {
      const preferencias = await repositorio.preferencias()
      const { claveDeIa } = preferencias
      if (!claveDeIa || !avisoIaAceptado(preferencias)) {
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
    if (agregando) return
    setAgregando(true)
    setIaError(null)
    // Las que ya se guardaron salen de la lista aunque falle una del medio, para que
    // un reintento no las duplique.
    const guardadas = new Set<number>()
    try {
      await guardarSugerencias(guardadas)
    } catch {
      const quedan = sugerencias
        .map((sugerencia, indice) => ({ sugerencia, elegida: elegidas.includes(indice), indice }))
        .filter((cada) => !guardadas.has(cada.indice))
      setSugerencias(quedan.map((cada) => cada.sugerencia))
      setElegidas(quedan.flatMap((cada, nuevo) => (cada.elegida ? [nuevo] : [])))
      setIaError('No pudimos agregar todas las ideas. Las que siguen acá no se guardaron: probá de nuevo.')
      return
    } finally {
      setAgregando(false)
    }

    setSugerencias([])
    setElegidas([])
    setIaTexto('')
    setIaFoto(null)
    if (guardadas.size > 0) {
      avisar(
        guardadas.size === 1
          ? 'Agregaste 1 idea a «Tus propias».'
          : `Agregaste ${new Intl.NumberFormat('es-AR').format(guardadas.size)} ideas a «Tus propias».`,
      )
    }
  }

  async function guardarSugerencias(guardadas: Set<number>): Promise<void> {
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
      guardadas.add(indice)
    }
  }

  async function agregar(): Promise<void> {
    if (agregando) return
    const texto = propia.trim()
    if (texto === '') {
      setErrorPropia('Escribí qué hay que hacer.')
      campoPropia.current?.focus()
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

    setAgregando(true)
    try {
      await repositorio.guardarTarea(tarea)
    } catch {
      // Lo escrito se queda en el campo: perderlo por un fallo del disco sería peor
      // que el fallo mismo.
      setErrorPropia('No pudimos guardar la tarea. Probá de nuevo.')
      campoPropia.current?.focus()
      return
    } finally {
      setAgregando(false)
    }

    setConocidas((previas) => [...previas, tarea])
    setIncluidas((previas) => [...previas, tarea.id])
    setPropia('')
    setErrorPropia(null)
    // La tarea nueva entra en «Tus propias», que muchas veces queda fuera de la
    // vista: sin este aviso, tocar «Agregá» parecía no hacer nada más que vaciar
    // el campo.
    avisar(`Agregaste «${texto}» a «Tus propias».`)
  }

  /*
    Un ambiente que no está en el catálogo —una dirección vieja o mal escrita— se
    dice como tal. Antes la pantalla mostraba «Ambiente» y una lista vacía, y los
    botones de abajo seguían ahí como si hubiera algo para armar.
  */
  if (!ambiente) {
    return (
      <main className="pantalla">
        <LamparaApagada />
        <h1 className="pantalla__titulo">No encontramos ese ambiente</h1>
        <p className="menudo">Puede que el enlace esté viejo. Tus ambientes y tus tareas siguen donde estaban.</p>
        <div className="pantalla__pie">
          <Link className="boton-principal" to="/">
            Elegí ambientes
          </Link>
        </div>
      </main>
    )
  }

  if (falloLaCarga) {
    return <ErrorDeCarga titulo={ambiente.nombre} alReintentar={reintentar} />
  }

  if (cargando) {
    return (
      <main className="pantalla">
        <h1 className="pantalla__titulo">{ambiente.nombre}</h1>
        <p className="menudo">Esto es lo que solemos hacer acá. Destildá lo que no quieras.</p>
        <Esqueleto forma="tareas" />
      </main>
    )
  }

  return (
    <main className="pantalla">
      <h1 className="pantalla__titulo">{ambiente.nombre}</h1>
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

      {/*
        Con todo destildado no hay nada que este ambiente aporte al plan, y antes no
        se decía: la persona seguía y descubría recién en el plan que faltaba.
      */}
      {incluidas.length === 0 && (
        <p className="alerta" role="status">
          No quedó nada tildado en {ambiente.nombre.toLowerCase()}, así que no va a entrar en el plan. Tildá algo, o
          agregá algo tuyo abajo.
        </p>
      )}

      {errorCambio && (
        <p className="alerta" role="status" aria-live="polite">
          {errorCambio}
        </p>
      )}

      <div className="pantalla__pie">
        {/*
          Campo y botón juntos, en un formulario: Enter agrega, como en cualquier
          campo. Antes el botón quedaba después de toda la sección de IA, a una
          pantalla de distancia de lo que la persona acababa de escribir.
        */}
        <form
          className="campo"
          noValidate
          onSubmit={(evento) => {
            evento.preventDefault()
            void agregar()
          }}
        >
          <label className="campo__etiqueta" htmlFor="tarea-propia">
            Agregar algo mío
          </label>
          <div className="campo__fila">
            <input
              ref={campoPropia}
              id="tarea-propia"
              name="tarea-propia"
              className="campo__entrada"
              autoComplete="off"
              maxLength={LARGO_MAXIMO_TAREA}
              value={propia}
              placeholder="regar las plantas…"
              aria-invalid={errorPropia !== null}
              aria-describedby={errorPropia ? 'tarea-propia-error' : undefined}
              onChange={(evento) => {
                setPropia(evento.target.value)
                setErrorPropia(null)
              }}
            />
            <BotonConCarga type="submit" cargando={agregando}>
              Agregá
            </BotonConCarga>
          </div>
          {errorPropia && (
            <p id="tarea-propia-error" className="alerta" role="status" aria-live="polite">
              {errorPropia}
            </p>
          )}
        </form>

        <section className="grupo">
          <h2 className="grupo__titulo">¿No sabés por dónde empezar?</h2>
          <p className="menudo">
            Contá lo que ves, o sacale una foto, y la IA te tira ideas. Vos elegís cuáles quedan.
          </p>

          <label className="campo__etiqueta" htmlFor="ia-texto">
            Contá lo que ves
          </label>
          <textarea
            id="ia-texto"
            name="ia-texto"
            className="campo__entrada campo__entrada--varias-lineas"
            rows={3}
            maxLength={LARGO_MAXIMO_DESCRIPCION}
            value={iaTexto}
            placeholder="Ejemplo: hay ropa tirada y la mesada llena de cosas…"
            onChange={(evento) => setIaTexto(evento.target.value)}
            onKeyDown={(evento) => {
              // En un campo de varias líneas, Enter es un salto de línea: el envío
              // va con Ctrl+Enter (⌘+Enter en Mac), como en cualquier editor.
              if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) {
                evento.preventDefault()
                void pedirIdeas()
              }
            }}
          />

          <SelectorDeArchivo
            id="ia-foto"
            etiqueta={iaFoto ? 'Cambiar la foto…' : 'O sacale una foto…'}
            accept="image/*"
            elegido={iaFoto?.name ?? null}
            alElegir={setIaFoto}
          />

          <BotonConCarga onClick={() => void pedirIdeas()} cargando={pensando}>
            Pedí ideas
          </BotonConCarga>

          {iaError && (
            <p className="alerta" role="status" aria-live="polite">
              {iaError}
            </p>
          )}

          {sugerencias.length > 0 && (
            <ul className="fichas fichas--una-columna">
              {sugerencias.map((sugerencia, indice) => (
                <li key={`${sugerencia.accion}-${indice}`}>
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
            <BotonConCarga onClick={() => void agregarSugerencias()} cargando={agregando}>
              Agregá las elegidas
            </BotonConCarga>
          )}

          <Link className="menudo" to="/ajustes">
            Configurar la IA
          </Link>
        </section>

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
              Seguí con {siguiente.nombre.toLowerCase()}
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
