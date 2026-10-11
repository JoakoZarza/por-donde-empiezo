import { create } from 'zustand'
import { CATALOGO, tareasDeAmbiente } from '../../domain/catalogo'
import { crearRepositorioLocal } from '../../data/repositorioLocal'
import type { Repositorio } from '../../data/repositorio'
import type { Ambiente, Paso, Plan } from '../../domain/tipos'

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

    for (const ambiente of elegidos) {
      await repo.guardarAmbiente(ambiente)
      for (const tarea of tareasDeAmbiente(ambiente.id)) {
        await repo.guardarTarea(tarea)
      }
    }

    set({ ambientes: await repo.listarAmbientes() })
    return elegidos[0]?.id ?? null
  },

  abrirPlan(plan) {
    set({ planActual: plan, pasoActual: 0 })
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
}))
