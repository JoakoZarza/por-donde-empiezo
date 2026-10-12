import Dexie from 'dexie'
import type { Table } from 'dexie'
import type { Ambiente, MarcaDeHistorial, Plan, Preferencias, Tarea } from '../domain/tipos'
import { PREFERENCIAS_POR_DEFECTO } from './repositorio'
import type { Repositorio } from './repositorio'
import { armarRespaldo } from '../domain/respaldo'

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

/** La marca del historial, más la clave que le asigna la base. */
interface FilaHistorial extends MarcaDeHistorial {
  id?: number
}

const CLAVE_PREFERENCIAS = 'unica'

class BaseLocal extends Dexie {
  ambientes!: Table<Ambiente, string>
  tareas!: Table<Tarea, string>
  hechas!: Table<Hecha, string>
  planes!: Table<Plan, string>
  preferencias!: Table<FilaPreferencias, string>
  historial!: Table<FilaHistorial, number>

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
    /*
      La segunda versión agrega el historial. La primera queda declarada a propósito:
      así un teléfono que ya tiene datos se actualiza solo, en vez de perderlos.
    */
    this.version(2).stores({
      ambientes: 'id, ordenRecorrido',
      tareas: 'id, ambienteId',
      hechas: 'tareaId, ambienteId',
      planes: 'id, creadoEn',
      preferencias: 'clave',
      historial: '++id, ambienteId, hechoEn',
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
      /*
        Y se anota en el historial, la tabla que solo crece. Marcar la misma tarea dos
        veces —porque se reinició el ciclo— anota dos veces: es trabajo hecho dos
        veces, y el total tiene que reflejarlo.
      */
      await base.historial.add({
        tareaId,
        ambienteId: tarea.ambienteId,
        minutos: tarea.duracionMin,
        hechoEn,
      })
    },

    async limpiarHechas(ambienteId) {
      // Solo las marcas del ciclo: los totales históricos viven en otra tabla y no
      // se tocan. Nada de lo que la persona ganó se pierde.
      await base.hechas.where('ambienteId').equals(ambienteId).delete()
    },

    async listarHistorial() {
      return base.historial.toArray()
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
      /*
        Se parte de los valores por defecto y se pisa con lo guardado, en vez de
        listar los campos a mano. Listándolos, cualquier preferencia nueva se
        perdía en silencio al leer: la fila guardada la tenía y la app la devolvía
        como si no existiera.
      */
      return {
        ...PREFERENCIAS_POR_DEFECTO,
        ...fila,
        herramientasDisponibles: fila.herramientasDisponibles ?? PREFERENCIAS_POR_DEFECTO.herramientasDisponibles,
        modoPorDefecto: fila.modoPorDefecto ?? PREFERENCIAS_POR_DEFECTO.modoPorDefecto,
        duracionRetoPreferida: fila.duracionRetoPreferida ?? PREFERENCIAS_POR_DEFECTO.duracionRetoPreferida,
        estiloDeReloj: fila.estiloDeReloj ?? PREFERENCIAS_POR_DEFECTO.estiloDeReloj,
        playlistPropia: fila.playlistPropia ?? null,
        claveDeIa: fila.claveDeIa ?? null,
        avisoDePrivacidadAceptado: fila.avisoDePrivacidadAceptado ?? false,
      }
    },

    async guardarPreferencias(preferencias) {
      await base.preferencias.put({ clave: CLAVE_PREFERENCIAS, ...preferencias })
    },

    async exportar() {
      const [ambientes, tareas, hechas, filas, planes, fila] = await Promise.all([
        base.ambientes.toArray(),
        base.tareas.toArray(),
        base.hechas.toArray(),
        base.historial.toArray(),
        base.planes.toArray(),
        base.preferencias.get(CLAVE_PREFERENCIAS),
      ])

      return armarRespaldo(
        {
          ambientes,
          tareas,
          hechas,
          // Se descarta la clave que le puso la base: no significa nada fuera de acá.
          historial: filas.map(({ tareaId, ambienteId, minutos, hechoEn }) => ({
            tareaId,
            ambienteId,
            minutos,
            hechoEn,
          })),
          planes,
          preferencias: { ...PREFERENCIAS_POR_DEFECTO, ...(fila ?? {}) },
        },
        new Date().toISOString(),
      )
    },

    async importar(respaldo) {
      const clave = (marca: { tareaId: string; hechoEn: string }): string => `${marca.tareaId}|${marca.hechoEn}`

      /*
        Se lee lo que ya hay antes de escribir, para poder sumar sin pisar. Todo va
        en una sola transacción: si algo falla a mitad de camino, el teléfono queda
        como estaba y no a medio importar.
      */
      const yaHay = {
        ambientes: new Set((await base.ambientes.toArray()).map((ambiente) => ambiente.id)),
        tareas: new Set((await base.tareas.toArray()).map((tarea) => tarea.id)),
        planes: new Set((await base.planes.toArray()).map((plan) => plan.id)),
        hechas: new Set((await base.hechas.toArray()).map(clave)),
        historial: new Set((await base.historial.toArray()).map(clave)),
      }

      await base.transaction(
        'rw',
        [base.ambientes, base.tareas, base.hechas, base.historial, base.planes, base.preferencias],
        async () => {
          for (const ambiente of respaldo.ambientes) {
            if (yaHay.ambientes.has(ambiente.id)) continue
            await base.ambientes.put(ambiente)
          }
          for (const tarea of respaldo.tareas) {
            if (yaHay.tareas.has(tarea.id)) continue
            await base.tareas.put(tarea)
          }
          for (const plan of respaldo.planes) {
            if (yaHay.planes.has(plan.id)) continue
            await base.planes.put(plan)
          }
          for (const marca of respaldo.hechas) {
            if (yaHay.hechas.has(clave(marca))) continue
            await base.hechas.put(marca)
          }
          for (const marca of respaldo.historial) {
            if (yaHay.historial.has(clave(marca))) continue
            await base.historial.add(marca)
          }
          // Los ajustes sí se adoptan: son de la persona, no del teléfono.
          await base.preferencias.put({ clave: CLAVE_PREFERENCIAS, ...respaldo.preferencias })
        },
      )
    },

    async borrarTodo() {
      // Con seis tablas hay que usar la forma de lista: la de argumentos sueltos
      // tiene un tope de cinco.
      await base.transaction(
        'rw',
        [base.ambientes, base.tareas, base.hechas, base.planes, base.preferencias, base.historial],
        async () => {
          await Promise.all([
            base.ambientes.clear(),
            base.tareas.clear(),
            base.hechas.clear(),
            base.planes.clear(),
            base.preferencias.clear(),
            base.historial.clear(),
          ])
        },
      )
    },
  }
}
