import { create } from 'zustand'
import { CATALOGO, tareasDeAmbiente } from '../../domain/catalogo'
import { generarPlan } from '../../domain/motor/generarPlan'
import { crearRepositorioLocal } from '../../data/repositorioLocal'
import { nuevoId } from '../id'
import type { Repositorio } from '../../data/repositorio'
import type { Ambiente, Paso, Plan, Tarea } from '../../domain/tipos'

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
  cargar(): Promise<void>
  /**
   * Guarda los ambientes elegidos con sus tareas del catálogo, y devuelve el id
   * del primero del recorrido para que la pantalla sepa a dónde ir.
   */
  elegirAmbientes(ids: string[]): Promise<string | null>
  abrirPlan(plan: Plan): void
  /** El paso en curso, o nulo si no hay plan o ya se terminó. */
  paso(): Paso | null
  avanzar(ahora: string): Promise<void>
  saltear(ahora: string): Promise<void>
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

  const pasos = planActual.pasos.map((actual, indice) =>
    indice === pasoActual ? { ...actual, estado, hechoEn: ahora } : actual,
  )
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

  async cargar() {
    const { repositorio: repo } = get()
    set({ ambientes: await repo.listarAmbientes() })
  },

  async elegirAmbientes(ids) {
    const { repositorio: repo } = get()
    const elegidos = CATALOGO.ambientes
      .filter((ambiente) => ids.includes(ambiente.id))
      .sort((a, b) => a.ordenRecorrido - b.ordenRecorrido)

    const yaGuardados = new Set((await repo.listarAmbientes()).map((ambiente) => ambiente.id))

    for (const ambiente of elegidos) {
      await repo.guardarAmbiente(ambiente)
      // Solo se siembra la primera vez. Si la persona ya había destildado tareas de
      // este ambiente, volver a elegirlo no puede resucitarlas.
      if (yaGuardados.has(ambiente.id)) continue
      for (const tarea of tareasDeAmbiente(ambiente.id)) {
        await repo.guardarTarea(tarea)
      }
    }

    set({ ambientes: await repo.listarAmbientes() })
    return elegidos[0]?.id ?? null
  },

  abrirPlan(plan) {
    // Se retoma en el primer paso PENDIENTE, no en el primero: al recargar la
    // página el plan ya tiene pasos hechos, y volver al paso 1 los haría rehacer.
    const primeroPendiente = plan.pasos.findIndex((paso) => paso.estado === 'pendiente')
    set({ planActual: plan, pasoActual: primeroPendiente === -1 ? plan.pasos.length : primeroPendiente })
  },

  paso() {
    const { planActual, pasoActual } = get()
    return planActual?.pasos[pasoActual] ?? null
  },

  async avanzar(ahora) {
    await cerrarPaso(set, get, 'hecho', ahora)
  },

  async saltear(ahora) {
    await cerrarPaso(set, get, 'salteado', ahora)
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
