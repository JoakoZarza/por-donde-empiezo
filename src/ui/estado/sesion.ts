import { create } from 'zustand'
import { CATALOGO, tareasDeAmbiente } from '../../domain/catalogo'
import { generarPlan } from '../../domain/motor/generarPlan'
import { crearRepositorioLocal } from '../../data/repositorioLocal'
import { pedirAlmacenamientoPersistente } from '../../data/almacenamiento'
import { nuevoId } from '../id'
import type { Repositorio } from '../../data/repositorio'
import type { Ambiente, Plan, Tarea } from '../../domain/tipos'

/*
  El estado de la sesión en curso.

  Vive FUERA del árbol de rutas a propósito: es lo que hace que navegar entre
  pantallas, ir atrás o volver a abrir la app no borre el plan. La URL identifica
  QUÉ plan está abierto; este store guarda el plan y en qué paso va.

  Todo lo que se pueda derivar no se guarda acá: el plan es la fuente de verdad y
  el repositorio es el que lo persiste.
*/

interface EstadoSesion {
  repositorio: Repositorio
  /** Los ambientes que la persona eligió, en orden de recorrido. */
  ambientes: Ambiente[]
  planActual: Plan | null
  pasoActual: number
  /**
   * Guarda los ambientes elegidos con sus tareas del catálogo, y devuelve el id
   * del primero del recorrido para que la pantalla sepa a dónde ir.
   */
  elegirAmbientes(ids: string[]): Promise<string | null>
  abrirPlan(plan: Plan): void
  avanzar(ahora: string): Promise<void>
  saltear(ahora: string): Promise<void>
  /**
   * Vuelve atrás un salteo: el paso anterior, si fue salteado, vuelve a ser el
   * actual. Solo deshace salteos: un «Listo» ya quedó en el historial, que no baja.
   */
  deshacerSalteo(ahora: string): Promise<void>
  /** Rearma el plan con lo que quedó pendiente. Devuelve el id nuevo, o nulo. */
  reordenar(ahora: string): Promise<string | null>
}

const repositorio = crearRepositorioLocal()

/** Marca el paso en curso y pasa al siguiente, persistiendo el plan. */
async function cerrarPaso(
  set: (parcial: Partial<EstadoSesion>) => void,
  get: () => EstadoSesion,
  estado: 'hecho' | 'salteado',
  ahora: string,
): Promise<void> {
  const { planActual, pasoActual, repositorio: repo } = get()
  if (!planActual) return

  const paso = planActual.pasos[pasoActual]
  if (!paso) return

  /*
    Cuánto tardó: del momento en que este paso pasó a ser el actual hasta ahora. Si
    no hay marca de inicio —un plan armado antes de que existiera la medición— se usa
    el momento en que se armó el plan, que es la mejor aproximación disponible.
  */
  const desde = Date.parse(paso.empezadoEn ?? planActual.creadoEn)
  const segundosReales = Math.max(0, Math.round((Date.parse(ahora) - desde) / 1000))

  const pasos = planActual.pasos.map((actual, indice) => {
    if (indice === pasoActual) {
      return { ...actual, estado, hechoEn: ahora, segundosReales }
    }
    // El paso siguiente arranca ahora: es su marca de inicio, y sin ella no se podría
    // medir nada.
    if (indice === pasoActual + 1 && !actual.empezadoEn) {
      return { ...actual, empezadoEn: ahora }
    }
    return actual
  })
  const actualizado: Plan = { ...planActual, pasos }

  // Primero el registro del ciclo, después el plan. Si el primero falla, el plan
  // no se toca y el estado de la pantalla sigue siendo coherente con lo guardado.
  if (estado === 'hecho') {
    await repo.marcarHecha(paso.tareaId, ahora)
  }
  await repo.guardarPlan(actualizado)
  set({ planActual: actualizado, pasoActual: pasoActual + 1 })
}

export const useSesion = create<EstadoSesion>((set, get) => ({
  repositorio,
  ambientes: [],
  planActual: null,
  pasoActual: 0,

  async elegirAmbientes(ids) {
    const { repositorio: repo } = get()
    const elegidos = CATALOGO.ambientes
      .filter((ambiente) => ids.includes(ambiente.id))
      .sort((a, b) => a.ordenRecorrido - b.ordenRecorrido)

    const yaGuardados = new Set((await repo.listarAmbientes()).map((ambiente) => ambiente.id))

    /*
      La primera pantalla viene con los ambientes de antes ya tildados, así que
      destildar uno ahí es sacarlo del recorrido. Sale de la lista de ambientes, y
      con eso de los planes; sus tareas y su historial quedan guardados, y vuelven
      tal cual si lo elige otra vez.
    */
    for (const id of yaGuardados) {
      if (!ids.includes(id)) await repo.eliminarAmbiente(id)
    }

    for (const ambiente of elegidos) {
      await repo.guardarAmbiente(ambiente)
      // Solo se siembra la primera vez. Si la persona ya había destildado tareas de
      // este ambiente —ahora o antes de sacarlo del recorrido—, volver a elegirlo no
      // puede resucitarlas.
      if (yaGuardados.has(ambiente.id)) continue
      if ((await repo.listarTareas(ambiente.id)).length > 0) continue
      for (const tarea of tareasDeAmbiente(ambiente.id)) {
        await repo.guardarTarea(tarea)
      }
    }

    set({ ambientes: await repo.listarAmbientes() })

    // Es el primer momento en que hay algo de la persona guardado, y viene de un
    // toque suyo: el navegador concede (o pregunta) mejor en respuesta a una acción.
    // No se espera: si tarda o no se concede, el flujo sigue igual.
    void pedirAlmacenamientoPersistente()

    return elegidos[0]?.id ?? null
  },

  abrirPlan(plan) {
    // Se retoma en el primer paso PENDIENTE, no en el primero: al recargar la
    // página el plan ya tiene pasos hechos, y volver al paso 1 los haría rehacer.
    const primeroPendiente = plan.pasos.findIndex((paso) => paso.estado === 'pendiente')

    /*
      Y si el paso en curso no tiene marca de inicio, se le pone ahora: es lo que
      permite medir cuánto tarda. Sin esto, la primera tarea de cada plan mediría
      desde que se armó el plan, aunque la persona haya empezado mucho después.
    */
    const pasos =
      primeroPendiente === -1 || plan.pasos[primeroPendiente]?.empezadoEn
        ? plan.pasos
        : plan.pasos.map((paso, indice) =>
            indice === primeroPendiente ? { ...paso, empezadoEn: new Date().toISOString() } : paso,
          )

    set({
      planActual: { ...plan, pasos },
      pasoActual: primeroPendiente === -1 ? plan.pasos.length : primeroPendiente,
    })
  },

  async avanzar(ahora) {
    await cerrarPaso(set, get, 'hecho', ahora)
  },

  async saltear(ahora) {
    await cerrarPaso(set, get, 'salteado', ahora)
  },

  async deshacerSalteo(ahora) {
    const { planActual, pasoActual, repositorio: repo } = get()
    const indice = pasoActual - 1
    const paso = planActual?.pasos[indice]
    if (!planActual || !paso || paso.estado !== 'salteado') return

    // Vuelve pendiente y arranca a medir de nuevo desde ahora: el rato que estuvo
    // salteado no es tiempo de trabajo en esa tarea.
    const pasos = planActual.pasos.map((actual, cada) =>
      cada === indice
        ? { ...actual, estado: 'pendiente' as const, hechoEn: null, segundosReales: null, empezadoEn: ahora }
        : actual,
    )
    const actualizado: Plan = { ...planActual, pasos }
    await repo.guardarPlan(actualizado)
    set({ planActual: actualizado, pasoActual: indice })
  },

  async reordenar(ahora) {
    const { planActual, repositorio: repo } = get()
    if (!planActual) return null

    const hechas = planActual.pasos.filter((paso) => paso.estado === 'hecho').map((paso) => paso.tareaId)
    const pendientes = new Set(
      planActual.pasos.filter((paso) => paso.estado !== 'hecho').map((paso) => paso.tareaId),
    )

    const ambientes = await repo.listarAmbientes()
    const tareas: Tarea[] = []
    for (const ambiente of ambientes) {
      const guardadas = await repo.listarTareas(ambiente.id)
      tareas.push(...guardadas.filter((tarea) => pendientes.has(tarea.id)))
    }

    const { herramientasDisponibles } = await repo.preferencias()
    const minutos = planActual.presupuestoSegundos === null ? null : planActual.presupuestoSegundos / 60
    const idPlan = nuevoId()

    const { plan } = generarPlan(
      {
        ambientes,
        tareas,
        hechasEnCiclo: hechas,
        presupuestoMin: minutos,
        modo: planActual.modo,
        herramientasDisponibles,
      },
      ahora,
      idPlan,
    )

    await repo.guardarPlan(plan)
    set({ planActual: plan, pasoActual: 0 })
    return idPlan
  },
}))
