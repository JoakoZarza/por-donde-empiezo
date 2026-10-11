import { ambienteCocina, objetosCocina, tareasCocina } from './cocina'
import { ambientes as otrosAmbientes, objetos as otrosObjetos, tareas as otrasTareas } from './ambientes'
import type { Ambiente, Objeto, Tarea } from '../tipos'

/*
  El catálogo completo: los ocho ambientes y todo lo que hay adentro.

  Es la única puerta de entrada al contenido. El motor, la persistencia y las
  pantallas leen de acá y no de los módulos por ambiente, para que agregar un
  ambiente nuevo sea tocar un solo archivo.
*/

export interface Catalogo {
  ambientes: Ambiente[]
  objetos: Objeto[]
  tareas: Tarea[]
}

export const CATALOGO: Catalogo = {
  ambientes: [ambienteCocina, ...otrosAmbientes],
  objetos: [...objetosCocina, ...otrosObjetos],
  tareas: [...tareasCocina, ...otrasTareas],
}

export function ambientePorId(id: string): Ambiente | undefined {
  return CATALOGO.ambientes.find((ambiente) => ambiente.id === id)
}

export function objetoPorId(id: string): Objeto | undefined {
  return CATALOGO.objetos.find((objeto) => objeto.id === id)
}

export function objetosDeAmbiente(ambienteId: string): Objeto[] {
  return CATALOGO.objetos.filter((objeto) => objeto.ambienteId === ambienteId)
}

export function tareasDeAmbiente(ambienteId: string): Tarea[] {
  return CATALOGO.tareas.filter((tarea) => tarea.ambienteId === ambienteId)
}
