import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useSesion } from '../estado/sesion'
import { useTitulo } from '../estado/useTitulo'
import { useAvisos } from '../estado/avisos'
import ErrorDeCarga from '../componentes/ErrorDeCarga'
import {
  enReloj,
  enVentaja,
  estadoDelReto,
  finDelReto,
  resumenDelReto,
  segundosRestantes,
  segundosTranscurridos,
} from '../../domain/contrarreloj'
import { calcularResultados, resultadoAnterior } from '../../domain/resultados'
import type { EstiloDeReloj } from '../../domain/tipos'
import type { Repositorio } from '../../data/repositorio'
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
/** Los segundos en palabras, redondeados: «48 segundos», «1:05». */
function enPalabras(segundos: number): string {
  const total = Math.round(Math.abs(segundos))
  if (total < 60) return `${total} segundo${total === 1 ? '' : 's'}`
  return enReloj(total)
}

export default function Plan() {
  const { planId = '' } = useParams()
  const navegar = useNavigate()

  const repositorio = useSesion((estado) => estado.repositorio)
  const abrirPlan = useSesion((estado) => estado.abrirPlan)
  const plan = useSesion((estado) => estado.planActual)
  const indice = useSesion((estado) => estado.pasoActual)
  const avanzar = useSesion((estado) => estado.avanzar)
  const saltear = useSesion((estado) => estado.saltear)
  const deshacerSalteo = useSesion((estado) => estado.deshacerSalteo)
  const avisar = useAvisos((estado) => estado.avisar)
  const reordenar = useSesion((estado) => estado.reordenar)

  const [tareas, setTareas] = useState<Record<string, Tarea>>({})
  const [ambientes, setAmbientes] = useState<Record<string, Ambiente>>({})
  const [cortado, setCortado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [noEncontrado, setNoEncontrado] = useState(false)
  const [falloLaCarga, setFalloLaCarga] = useState(false)
  const [intento, setIntento] = useState(0)
  const [ahora, setAhora] = useState<string | null>(null)
  /*
    Una acción por vez. Con el pulgar, a las apuradas, un doble toque en «Listo»
    marcaba dos pasos de una: el segundo toque llegaba mientras el primero todavía
    guardaba. Es una ref y no estado porque tiene que cortar el segundo toque en el
    mismo instante, sin esperar a que React vuelva a dibujar.
  */
  const enCurso = useRef(false)

  /*
    El latido del reloj. Solo late si el plan tiene presupuesto de tiempo, y se
    apaga al salir de la pantalla: no queda ningún temporizador corriendo de fondo.
  */
  useEffect(() => {
    if (!plan?.presupuestoSegundos) return
    setAhora(new Date().toISOString())
    const latido = setInterval(() => setAhora(new Date().toISOString()), 1000)
    return () => clearInterval(latido)
  }, [plan?.presupuestoSegundos])

  // Cuál de los dos relojes quiere la persona. Se lee una vez al abrir la pantalla.
  const [estilo, setEstilo] = useState<EstiloDeReloj>('cuentaAtras')

  useEffect(() => {
    let vigente = true

    void (async () => {
      // Si no se puede leer la preferencia, queda la cuenta atrás: no vale cortar la
      // sesión por el estilo del reloj.
      const preferencias = await repositorio.preferencias().catch(() => null)
      if (vigente && preferencias) setEstilo(preferencias.estiloDeReloj)
    })()

    return () => {
      vigente = false
    }
  }, [repositorio])

  useTitulo('El plan')

  useEffect(() => {
    let vigente = true

    async function cargar(): Promise<void> {
      let guardado: Awaited<ReturnType<Repositorio['obtenerPlan']>>
      const porTarea: Record<string, Tarea> = {}
      const porAmbiente: Record<string, Ambiente> = {}

      try {
        guardado = await repositorio.obtenerPlan(planId)
        const listaDeAmbientes = await repositorio.listarAmbientes()

        for (const ambiente of listaDeAmbientes) {
          porAmbiente[ambiente.id] = ambiente
          for (const tarea of await repositorio.listarTareas(ambiente.id)) {
            porTarea[tarea.id] = tarea
          }
        }
      } catch {
        if (vigente) {
          setFalloLaCarga(true)
          setCargando(false)
        }
        return
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
  }, [planId, repositorio, abrirPlan, intento])

  function reintentar(): void {
    setFalloLaCarga(false)
    setCargando(true)
    setIntento((previo) => previo + 1)
  }

  const paso = plan?.pasos[indice]
  const tarea = paso ? tareas[paso.tareaId] : undefined
  const total = plan?.pasos.length ?? 0
  const hechos = plan?.pasos.filter((cada) => cada.estado === 'hecho').length ?? 0
  const ambiente = tarea ? ambientes[tarea.ambienteId] : undefined

  // El reloj. `ahora` es nulo hasta el primer latido, así que sin presupuesto de
  // tiempo no se muestra nada: un plan sin límite no tiene cuenta regresiva.
  const minutosPorTarea: Record<string, number> = {}
  for (const [id, cada] of Object.entries(tareas)) minutosPorTarea[id] = cada.duracionMin

  const fin = plan ? finDelReto(plan.creadoEn, plan.presupuestoSegundos) : null
  const restantes = fin && ahora ? segundosRestantes(fin, ahora) : null
  const resumen = plan ? resumenDelReto(plan.pasos, minutosPorTarea) : null
  const sinTiempo =
    resumen !== null && restantes !== null && estadoDelReto(resumen, restantes) === 'seAcaboElTiempo'

  // El reloj de carrera: cuánto pasó, y la diferencia contra lo estimado para el
  // trabajo ya hecho. Va en el mismo lugar que la cuenta atrás, porque es la misma
  // información mirada al revés.
  const transcurridos = plan && ahora ? segundosTranscurridos(plan.creadoEn, ahora) : null

  /*
    El resultado de la tarea anterior, quieto. En vivo el número cambiaba mientras se
    trabajaba, y eso es ruido: no se puede leer mientras se limpia. Como resultado de
    algo que ya terminaste, en cambio, dice algo concreto.
  */
  const anterior = plan ? resultadoAnterior(plan.pasos, indice, minutosPorTarea) : null

  /** Corre la acción si no hay otra en curso; si falla, deja el aviso. */
  async function unaPorVez(accion: () => Promise<void>, siFalla: string): Promise<void> {
    if (enCurso.current) return
    enCurso.current = true
    try {
      await accion()
      setError(null)
    } catch {
      setError(siFalla)
    } finally {
      enCurso.current = false
    }
  }

  function alListo(): Promise<void> {
    return unaPorVez(() => avanzar(new Date().toISOString()), 'No pudimos guardar el paso. Probá de nuevo.')
  }

  function alSaltear(): Promise<void> {
    const nombre = tarea ? `${tarea.accion} ${tarea.descripcion}`.trim() : 'el paso'
    return unaPorVez(async () => {
      await saltear(new Date().toISOString())
      /*
        Un toque con poca puntería en «Saltear» —que está justo debajo de «Listo»—
        no puede costar una tarea sin vuelta. Nunca se pierde nada en silencio.
      */
      avisar(`Salteaste «${nombre}».`, {
        etiqueta: 'Deshacer',
        alTocar: async () => {
          try {
            await deshacerSalteo(new Date().toISOString())
          } catch {
            avisar('No pudimos deshacer el salteo. Probá de nuevo.')
          }
        },
      })
    }, 'No pudimos saltear el paso. Probá de nuevo.')
  }

  function alReordenar(): Promise<void> {
    return unaPorVez(async () => {
      const nuevo = await reordenar(new Date().toISOString())
      if (nuevo) navegar(`/plan/${nuevo}`)
    }, 'No pudimos reordenar. Probá de nuevo.')
  }

  if (falloLaCarga) return <ErrorDeCarga titulo="El plan" alReintentar={reintentar} />

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
    const planilla = calcularResultados(plan.pasos, minutosPorTarea)

    return (
      <main className="pantalla">
        <h1 className="pantalla__titulo">El plan</h1>
        <p className="cierre">
          {hechos === total ? 'Terminaste lo que te propusiste.' : `Hiciste ${hechos} de ${total}.`}
        </p>

        {planilla.realSegundos > 0 && (
          <section className="grupo">
            <h2 className="pantalla__titulo">Cómo te fue</h2>
            <p className="resultado">
              {planilla.diferenciaSegundos >= 0
                ? `Le ganaste a la estimación por ${enPalabras(planilla.diferenciaSegundos)}.`
                : `Te pasaste de la estimación por ${enPalabras(Math.abs(planilla.diferenciaSegundos))}.`}
            </p>
            <p className="menudo">
              {enReloj(planilla.realSegundos)} de trabajo real, contra {enReloj(planilla.estimadoSegundos)} estimados.
              {planilla.ganadas > 0 && ` Le ganaste a ${planilla.ganadas} ${planilla.ganadas === 1 ? 'tarea' : 'tareas'}.`}
              {planilla.perdidas > 0 && ` Te pasaste en ${planilla.perdidas}.`}
              {planilla.conPausa > 0 &&
                ` Las ${planilla.conPausa === 1 ? 'tarea' : 'tareas'} con pausa quedan fuera de la cuenta.`}
            </p>

            <ul className="planilla">
              {planilla.tareas.map((fila) => {
                const cada = tareas[fila.tareaId]
                return (
                  <li key={fila.tareaId} className="fila">
                    <span className="fila__nombre">
                      {cada ? `${cada.accion} ${cada.descripcion}`.trim() : fila.tareaId}
                    </span>
                    <span className="fila__cifras tabular">
                      {fila.realSegundos === null ? '—' : enReloj(fila.realSegundos)}
                      {fila.diferenciaSegundos !== null && (
                        <span className={fila.diferenciaSegundos < 0 ? 'ventaja ventaja--atras' : 'ventaja'}>
                          {enVentaja(fila.diferenciaSegundos)}
                        </span>
                      )}
                      {fila.conPausa && <span className="menudo">con pausa</span>}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

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
        <div className="progreso__linea">
          <p className="menudo tabular">
            {Math.min(indice + 1, total)} de {total}
          </p>
          {estilo === 'carrera' && transcurridos !== null ? (
            <p className="reloj tabular">{enReloj(transcurridos)}</p>
          ) : (
            restantes !== null && (
              <p className={sinTiempo ? 'reloj reloj--agotado tabular' : 'reloj tabular'}>{enReloj(restantes)}</p>
            )
          )}
        </div>
        {/*
          Cuando se acaba el tiempo se dice, y nada más. No hay veredicto ni castigo:
          los botones de siempre siguen ahí y la persona decide si para o si sigue.
          Lo que hizo ya está anotado, y los totales no bajaron nada.
        */}
        {sinTiempo && estilo === 'cuentaAtras' && resumen && (
          <p className="menudo">
            Se acabó el tiempo: hiciste {resumen.hechos} de {resumen.total}. Podés seguir igual, se anota todo.
          </p>
        )}
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

        {anterior && (
          <p className={anterior.diferenciaSegundos !== null && anterior.diferenciaSegundos < 0 ? 'resultado resultado--atras' : 'resultado'}>
            {anterior.conPausa
              ? 'La tarea anterior estuvo abierta mucho rato, así que no la contamos como resultado.'
              : `Terminaste la anterior en ${enReloj(anterior.realSegundos ?? 0)}: ${
                  anterior.diferenciaSegundos !== null && anterior.diferenciaSegundos < 0
                    ? `te costó ${enPalabras(Math.abs(anterior.diferenciaSegundos))} más`
                    : `te sobraron ${enPalabras(Math.abs(anterior.diferenciaSegundos ?? 0))}`
                }.`}
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
