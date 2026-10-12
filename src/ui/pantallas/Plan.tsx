import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useSesion } from '../estado/sesion'
import { useTitulo } from '../estado/useTitulo'
import type { Ambiente, Tarea } from '../../domain/tipos'

/*
  La pantalla central.

  Una sola tarea, un solo botón. El medio de la pantalla queda vacío a propósito:
  es el cuarto, y lo único que brilla es el paso actual. Todo lo demás —el
  progreso, las acciones secundarias— está para que esa promesa se sostenga sin
  agregar carga.

  El plan se lee por su id desde la URL, así recargar la página o volver a abrirla
  no pierde la sesión.
*/
export default function Plan() {
  const { planId = '' } = useParams()
  const navegar = useNavigate()

  const repositorio = useSesion((estado) => estado.repositorio)
  const abrirPlan = useSesion((estado) => estado.abrirPlan)
  const plan = useSesion((estado) => estado.planActual)
  const indice = useSesion((estado) => estado.pasoActual)
  const avanzar = useSesion((estado) => estado.avanzar)
  const saltear = useSesion((estado) => estado.saltear)
  const reordenar = useSesion((estado) => estado.reordenar)

  const [tareas, setTareas] = useState<Record<string, Tarea>>({})
  const [ambientes, setAmbientes] = useState<Record<string, Ambiente>>({})
  const [cortado, setCortado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [noEncontrado, setNoEncontrado] = useState(false)

  useTitulo('El plan')

  useEffect(() => {
    let vigente = true

    async function cargar(): Promise<void> {
      const guardado = await repositorio.obtenerPlan(planId)
      const listaDeAmbientes = await repositorio.listarAmbientes()

      const porTarea: Record<string, Tarea> = {}
      const porAmbiente: Record<string, Ambiente> = {}
      for (const ambiente of listaDeAmbientes) {
        porAmbiente[ambiente.id] = ambiente
        for (const tarea of await repositorio.listarTareas(ambiente.id)) {
          porTarea[tarea.id] = tarea
        }
      }

      if (!vigente) return
      setTareas(porTarea)
      setAmbientes(porAmbiente)

      /*
        Un plan que no está en la base es un estado posible, no un accidente: puede
        ser una dirección vieja, o el teléfono haber borrado los datos por falta de
        uso. iOS lo hace a los siete días sin abrir la app, y este producto es de uso
        esporádico a propósito.

        Sin esta rama, la pantalla caía al render normal con el plan en nulo: «0 de
        0», el anuncio de «Cargando el plan…» para siempre, ningún paso, y los cuatro
        botones inertes porque no había nada que avanzar. Un callejón sin salida, y
        justo en la situación más probable: volver después de mucho tiempo.
      */
      if (!guardado) {
        // Si el plan está en memoria —recién armado en esta sesión— se usa ese: que
        // la base haya quedado atrás no tiene por qué cortar el trabajo en curso.
        if (!useSesion.getState().planActual) setNoEncontrado(true)
        setCargando(false)
        return
      }

      setCargando(false)

      // Solo se abre si es otro plan: si no, se perdería el avance al recargar.
      if (useSesion.getState().planActual?.id !== guardado.id) {
        abrirPlan(guardado)
      }
    }

    void cargar()
    return () => {
      vigente = false
    }
  }, [planId, repositorio, abrirPlan])

  const paso = plan?.pasos[indice]
  const tarea = paso ? tareas[paso.tareaId] : undefined
  const total = plan?.pasos.length ?? 0
  const hechos = plan?.pasos.filter((cada) => cada.estado === 'hecho').length ?? 0
  const ambiente = tarea ? ambientes[tarea.ambienteId] : undefined

  async function alListo(): Promise<void> {
    try {
      await avanzar(new Date().toISOString())
    } catch {
      setError('No pudimos guardar el paso. Probá de nuevo.')
    }
  }

  async function alSaltear(): Promise<void> {
    try {
      await saltear(new Date().toISOString())
    } catch {
      setError('No pudimos saltear el paso. Probá de nuevo.')
    }
  }

  async function alReordenar(): Promise<void> {
    try {
      const nuevo = await reordenar(new Date().toISOString())
      if (nuevo) navegar(`/plan/${nuevo}`)
    } catch {
      setError('No pudimos reordenar. Probá de nuevo.')
    }
  }

  if (cargando) {
    return (
      <main className="pantalla">
        <h1 className="sr-only">El plan</h1>
        <div className="lampara" aria-hidden="true" />
        <p className="menudo" role="status" aria-live="polite">
          Cargando el plan…
        </p>
      </main>
    )
  }

  // El plan no existe: se dice, y se ofrece una salida de verdad.
  if (noEncontrado) {
    return (
      <main className="pantalla">
        <h1 className="pantalla__titulo">No encontramos ese plan</h1>
        <p className="menudo">
          Puede que la dirección esté vieja, o que el teléfono haya borrado los datos por falta de uso. No se
          perdió nada tuyo: los ambientes y las tareas están donde estaban.
        </p>
        <div className="pantalla__pie">
          <Link className="boton-secundario" to="/">
            Volver al principio
          </Link>
          <Link className="boton-principal" to="/sesion/nueva">
            Armar una sesión nueva
          </Link>
        </div>
      </main>
    )
  }

  // Plan sin nada que hacer: se explica por qué, sin dejar la pantalla muerta.
  if (plan && total === 0) {
    return (
      <main className="pantalla">
        <h1 className="pantalla__titulo">El plan</h1>
        {plan.advertencias.map((advertencia) => (
          <p key={advertencia} className="menudo">
            {advertencia}
          </p>
        ))}
        <div className="pantalla__pie">
          <Link className="boton-secundario" to="/">
            Volver al principio
          </Link>
          <button type="button" className="boton-principal" onClick={() => navegar('/sesion/nueva')}>
            Seguir con más tiempo
          </button>
        </div>
      </main>
    )
  }

  // Se terminó, o la persona dijo que no puede ahora.
  if (plan && (cortado || !paso)) {
    return (
      <main className="pantalla">
        <h1 className="pantalla__titulo">El plan</h1>
        <p className="cierre">
          {hechos === total ? 'Terminaste lo que te propusiste.' : `Hiciste ${hechos} de ${total}.`}
        </p>
        <div className="pantalla__pie">
          <button type="button" className="boton-principal" onClick={() => navegar('/sesion/nueva')}>
            Seguir un rato más
          </button>
          <button type="button" className="boton-secundario" onClick={() => navegar('/')}>
            Listo por hoy
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="pantalla pantalla--plan">
      {/*
        El diseño no muestra un título en esta pantalla, pero la jerarquía de
        encabezados y los lectores de pantalla lo necesitan igual.
      */}
      <h1 className="sr-only">El plan</h1>

      <div className="progreso">
        <div className="progreso__barra" style={{ transform: `scaleX(${total === 0 ? 0 : indice / total})` }} />
        <p className="menudo tabular">
          {Math.min(indice + 1, total)} de {total}
        </p>
      </div>

      {/*
        El escenario: el hueco vacío del medio de la pantalla —el cuarto— con la
        lámpara brillando detrás de la tarjeta. La luz no es una banda suelta: es lo
        que ilumina el paso actual, y por eso vive pegada a la tarjeta.
      */}
      <div className="escenario">
        <div className="lampara" aria-hidden="true" key={indice} />

        {/*
          El aviso para lectores de pantalla. En el diseño aprobado arriba solo van
          la barra y el contador, así que el texto no se muestra: se anuncia.
        */}
        <p className="sr-only" role="status" aria-live="polite">
          {tarea ? `Paso actual: ${tarea.accion} ${tarea.descripcion}`.trim() : 'Cargando el plan…'}
        </p>

        {error && (
          <p className="alerta" role="status" aria-live="polite">
            {error}
          </p>
        )}

        {tarea && (
          <article className="paso" key={tarea.id}>
            {/*
              El verbo y el objeto van en la MISMA frase. Separados en dos renglones
              se leían como dos pedazos —«Limpiá» arriba, «la mesa» abajo— y no como
              la instrucción que son. La jerarquía se mantiene por tamaño y color,
              no partiendo la frase.
            */}
            <h2 className="paso__accion">
              {tarea.accion}
              {tarea.descripcion && <span className="paso__objeto"> {tarea.descripcion}</span>}
            </h2>
            <p className="menudo">
              {ambiente?.nombre ?? 'Casa'} · {tarea.duracionMin}&nbsp;min
            </p>
            {tarea.herramientas.length > 0 && (
              <p className="paso__herramientas">Vas a necesitar {tarea.herramientas.join(' y ')}</p>
            )}
          </article>
        )}
      </div>

      <div className="pantalla__pie">
        <button type="button" className="boton-principal" onClick={() => void alListo()}>
          Listo
        </button>
        <div className="acciones">
          <button type="button" className="boton-secundario" onClick={() => void alSaltear()}>
            Saltear
          </button>
          <button type="button" className="boton-secundario" onClick={() => setCortado(true)}>
            No puedo ahora
          </button>
          <button type="button" className="boton-secundario" onClick={() => void alReordenar()}>
            Reordenar
          </button>
        </div>
      </div>
    </main>
  )
}
