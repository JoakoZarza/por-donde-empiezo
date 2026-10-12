import { HERRAMIENTAS_POR_DEFECTO } from '../domain/tipos'
import type { Ambiente, MarcaDeHistorial, Plan, Preferencias, Tarea } from '../domain/tipos'

/*
  La única puerta a la persistencia.

  Hoy hay una sola implementación —el teléfono, con IndexedDB— y en el entregable 5
  se le suma la nube detrás de esta misma interfaz. Nada de la interfaz dice de
  dónde vienen los datos: es lo que hace que «sin cuenta» y «con cuenta» sean el
  mismo producto y no dos.
*/

export interface Repositorio {
  listarAmbientes(): Promise<Ambiente[]>
  guardarAmbiente(ambiente: Ambiente): Promise<void>
  eliminarAmbiente(ambienteId: string): Promise<void>

  /** Las tareas incluidas por la persona en ese ambiente. */
  listarTareas(ambienteId: string): Promise<Tarea[]>
  guardarTarea(tarea: Tarea): Promise<void>
  eliminarTarea(tareaId: string): Promise<void>

  /** Ids de las tareas hechas en el ciclo actual del ambiente. */
  listarHechas(ambienteId: string): Promise<string[]>
  marcarHecha(tareaId: string, hechoEn: string): Promise<void>
  /**
   * Abre un ciclo nuevo para el ambiente: sus tareas vuelven a estar pendientes.
   * No toca ningún total histórico. Es la acción «Arrancar de nuevo este
   * ambiente» de la especificación, sección 4.2.
   */
  limpiarHechas(ambienteId: string): Promise<void>

  /**
   * Todo lo que la persona terminó alguna vez, en orden de escritura.
   *
   * Es un registro que solo crece: reiniciar el ciclo de un ambiente no lo toca.
   * De acá salen los totales, y por eso no pueden bajar nunca. Solo `borrarTodo`
   * —la acción destructiva explícita— lo vacía.
   */
  listarHistorial(): Promise<MarcaDeHistorial[]>

  guardarPlan(plan: Plan): Promise<void>
  obtenerPlan(planId: string): Promise<Plan | null>
  ultimoPlan(): Promise<Plan | null>

  preferencias(): Promise<Preferencias>
  guardarPreferencias(preferencias: Preferencias): Promise<void>

  borrarTodo(): Promise<void>
}

/*
  Las herramientas que la app asume si la persona todavía no dijo nada. El modo
  por defecto es el que la especificación pide preseleccionado: «Arrancar ya».
*/
export const PREFERENCIAS_POR_DEFECTO: Preferencias = {
  herramientasDisponibles: [...HERRAMIENTAS_POR_DEFECTO],
  modoPorDefecto: 'arrancarYa',
  duracionRetoPreferida: 10,
  playlistPropia: null,
}
