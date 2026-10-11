import Dexie from 'dexie'
import type { Table } from 'dexie'
import type { Ambiente, Plan, Preferencias, Tarea } from '../domain/tipos'
import { PREFERENCIAS_POR_DEFECTO } from './repositorio'
import type { Repositorio } from './repositorio'

/*
  La implementación del repositorio sobre IndexedDB, con Dexie.

  Es la única que existe en el entregable 1, y la que hace que la app funcione sin
  cuenta y sin internet. Los datos no salen del teléfono.
*/

interface Hecha {
  tareaId: string
  ambienteId: string
  hechoEn: string
}

interface FilaPreferencias extends Preferencias {
  clave: string
}

const CLAVE_PREFERENCIAS = 'unica'

class BaseLocal extends Dexie {
  ambientes!: Table<Ambiente, string>
  tareas!: Table<Tarea, string>
  hechas!: Table<Hecha, string>
  planes!: Table<Plan, string>
  preferencias!: Table<FilaPreferencias, string>

  constructor(nombre: string) {
    super(nombre)
    this.version(1).stores({
      // El segundo campo de cada línea es el índice que se consulta.
      ambientes: 'id, ordenRecorrido',
      tareas: 'id, ambienteId',
      hechas: 'tareaId, ambienteId',
      planes: 'id, creadoEn',
      preferencias: 'clave',
    })
  }
}

export function crearRepositorioLocal(nombreBd = 'por-donde-empiezo'): Repositorio {
  const base = new BaseLocal(nombreBd)

  return {
    async listarAmbientes() {
      return base.ambientes.orderBy('ordenRecorrido').toArray()
    },

    async guardarAmbiente(ambiente) {
      await base.ambientes.put(ambiente)
    },

    async eliminarAmbiente(ambienteId) {
      await base.ambientes.delete(ambienteId)
    },

    async listarTareas(ambienteId) {
      return base.tareas.where('ambienteId').equals(ambienteId).toArray()
    },

    async guardarTarea(tarea) {
      // La acción es lo que la pantalla del plan muestra en grande: sin ella la
      // tarea sería invisible, y una lista con un renglón en blanco es peor que
      // un error claro. La descripción sí puede faltar: una tarea propia puede
      // ser una sola frase.
      if (tarea.accion.trim() === '') {
        throw new Error(`la tarea ${tarea.id} no tiene acción, y es lo que se muestra en el plan`)
      }
      await base.tareas.put(tarea)
    },

    async eliminarTarea(tareaId) {
      await base.tareas.delete(tareaId)
    },

    async listarHechas(ambienteId) {
      const filas = await base.hechas.where('ambienteId').equals(ambienteId).toArray()
      return filas.map((fila) => fila.tareaId)
    },

    async marcarHecha(tareaId, hechoEn) {
      const tarea = await base.tareas.get(tareaId)
      if (!tarea) {
        throw new Error(`no se puede marcar como hecha la tarea ${tareaId}: no está guardada`)
      }
      await base.hechas.put({ tareaId, ambienteId: tarea.ambienteId, hechoEn })
    },

    async limpiarHechas(ambienteId) {
      // Solo las marcas del ciclo: los totales históricos viven en otra tabla y no
      // se tocan. Nada de lo que la persona ganó se pierde.
      await base.hechas.where('ambienteId').equals(ambienteId).delete()
    },

    async guardarPlan(plan) {
      await base.planes.put(plan)
    },

    async obtenerPlan(planId) {
      return (await base.planes.get(planId)) ?? null
    },

    async ultimoPlan() {
      const planes = await base.planes.orderBy('creadoEn').reverse().limit(1).toArray()
      return planes[0] ?? null
    },

    async preferencias() {
      const fila = await base.preferencias.get(CLAVE_PREFERENCIAS)
      if (!fila) return { ...PREFERENCIAS_POR_DEFECTO }
      return {
        herramientasDisponibles: fila.herramientasDisponibles,
        modoPorDefecto: fila.modoPorDefecto,
        duracionRetoPreferida: fila.duracionRetoPreferida,
      }
    },

    async guardarPreferencias(preferencias) {
      await base.preferencias.put({ clave: CLAVE_PREFERENCIAS, ...preferencias })
    },

    async borrarTodo() {
      await base.transaction(
        'rw',
        base.ambientes,
        base.tareas,
        base.hechas,
        base.planes,
        base.preferencias,
        async () => {
          await Promise.all([
            base.ambientes.clear(),
            base.tareas.clear(),
            base.hechas.clear(),
            base.planes.clear(),
            base.preferencias.clear(),
          ])
        },
      )
    },
  }
}
