import { TIPOS_AMBIENTE, VERBOS } from '../tipos'
import type { Ambiente, Objeto, Tarea } from '../tipos'

/*
  Valida las obligaciones de integridad del catálogo (especificación, sección 5.4).
  Devuelve la lista de problemas encontrados; vacía si el catálogo está bien.
  Nunca lanza excepciones: un catálogo roto es un dato, no un accidente.

  Formato de los mensajes: los problemas de una tarea empiezan siempre con
  `tarea <id>:`, y los de un ambiente con `ambiente <id>:`. Es lo que permite que
  los tests afirmen sobre un problema concreto y no sobre el texto en general.

  Dos reglas de dependencia de la sección 5.4 NO se pueden comprobar acá y se
  garantizan al escribir el catálogo:
    - «arriba antes que abajo»: haría falta una noción de altura por objeto, que
      el modelo de datos no tiene.
    - «sacar antes que limpiar»: depende de la redacción.
  Sí se comprueba «seco antes que húmedo», que es la que más se olvida.
*/

/*
  Las expresiones se escriben sin la terminación del verbo a propósito: el
  catálogo guarda el imperativo en voseo («Barré», «Trapeá»), y buscar «barrer»
  literal no encontraría «Barré».
*/
const RE_HUMEDO = /trap|fregar el piso|lavar el piso|lavar el suelo|baldear/i
const RE_SECO = /barr|aspir|escob/i

/** La acción y su complemento juntos: ahí está la palabra que dice qué se hace. */
function texto(tarea: Tarea): string {
  return `${tarea.accion} ${tarea.descripcion}`
}

function enteroEnRango(valor: unknown, minimo: number, maximo: number): boolean {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= minimo && valor <= maximo
}

function validarAmbientes(ambientes: Ambiente[], problemas: string[]): void {
  const ids = new Set<string>()
  const ordenes = new Map<number, string>()

  for (const ambiente of ambientes) {
    if (ids.has(ambiente.id)) {
      problemas.push(`ambiente ${ambiente.id}: id duplicado`)
    }
    ids.add(ambiente.id)

    if (!TIPOS_AMBIENTE.includes(ambiente.tipo)) {
      problemas.push(`ambiente ${ambiente.id}: tipo inválido "${String(ambiente.tipo)}"`)
    }

    const ocupante = ordenes.get(ambiente.ordenRecorrido)
    if (ocupante !== undefined) {
      problemas.push(
        `ordenRecorrido repetido: ambiente ${ocupante} y ambiente ${ambiente.id} comparten ${ambiente.ordenRecorrido}`,
      )
    }
    ordenes.set(ambiente.ordenRecorrido, ambiente.id)
  }
}

function detectarCiclos(porId: Map<string, Tarea>, problemas: string[]): void {
  const estado = new Map<string, 'visitando' | 'listo'>()
  const pila: string[] = []

  const visitar = (id: string): void => {
    const actual = estado.get(id)
    if (actual === 'listo') return
    if (actual === 'visitando') {
      const desde = pila.indexOf(id)
      const ciclo = [...pila.slice(desde), id]
      problemas.push(`ciclo de dependencias: ${ciclo.join(' → ')}`)
      return
    }

    estado.set(id, 'visitando')
    pila.push(id)
    for (const dependencia of porId.get(id)?.requiere ?? []) {
      if (porId.has(dependencia)) visitar(dependencia)
    }
    pila.pop()
    estado.set(id, 'listo')
  }

  // Orden estable por id: el mismo catálogo produce siempre los mismos mensajes.
  for (const id of [...porId.keys()].sort((a, b) => a.localeCompare(b))) {
    visitar(id)
  }
}

export function validarCatalogo(
  ambientes: Ambiente[],
  tareas: Tarea[],
  objetos: Objeto[] = [],
): string[] {
  const problemas: string[] = []

  validarAmbientes(ambientes, problemas)

  const idsAmbientes = new Set(ambientes.map((ambiente) => ambiente.id))
  const idsObjetos = new Set(objetos.map((objeto) => objeto.id))
  const porId = new Map<string, Tarea>()

  for (const tarea of tareas) {
    if (porId.has(tarea.id)) {
      problemas.push(`tarea ${tarea.id}: id duplicado`)
    }
    porId.set(tarea.id, tarea)
  }

  for (const tarea of tareas) {
    if (!idsAmbientes.has(tarea.ambienteId)) {
      problemas.push(`tarea ${tarea.id}: el ambiente ${tarea.ambienteId} no existe`)
    }

    if (!VERBOS.includes(tarea.verbo)) {
      problemas.push(`tarea ${tarea.id}: verbo inválido "${String(tarea.verbo)}"`)
    }

    if (tarea.accion.trim() === '') {
      problemas.push(`tarea ${tarea.id}: la acción no puede estar vacía`)
    }

    if (!enteroEnRango(tarea.duracionMin, 1, Number.MAX_SAFE_INTEGER)) {
      problemas.push(`tarea ${tarea.id}: la duración debe ser un entero mayor que cero, y es ${tarea.duracionMin}`)
    }

    if (!enteroEnRango(tarea.esfuerzo, 1, 3)) {
      problemas.push(`tarea ${tarea.id}: el esfuerzo debe estar entre 1 y 3, y es ${tarea.esfuerzo}`)
    }

    if (!enteroEnRango(tarea.impactoVisual, 1, 3)) {
      problemas.push(
        `tarea ${tarea.id}: el impacto visual debe estar entre 1 y 3, y es ${tarea.impactoVisual}`,
      )
    }

    if (tarea.objetoId !== null && !idsObjetos.has(tarea.objetoId)) {
      problemas.push(`tarea ${tarea.id}: el objeto ${tarea.objetoId} no existe`)
    }

    for (const dependencia of tarea.requiere) {
      if (!porId.has(dependencia)) {
        problemas.push(`tarea ${tarea.id}: depende de ${dependencia}, que no existe`)
      }
    }
  }

  detectarCiclos(porId, problemas)

  // Cada ambiente necesita poder arrancar con un paso de 2 minutos sin dependencias.
  for (const ambiente of ambientes) {
    const tieneArranque = tareas.some(
      (tarea) => tarea.ambienteId === ambiente.id && tarea.duracionMin <= 2 && tarea.requiere.length === 0,
    )
    if (!tieneArranque) {
      problemas.push(`ambiente ${ambiente.id}: no tiene ninguna tarea de 2 minutos sin dependencias`)
    }
  }

  // Seco antes que húmedo.
  for (const tarea of tareas) {
    if (!RE_HUMEDO.test(texto(tarea))) continue
    const tieneSeco = tarea.requiere.some((id) => {
      const dependencia = porId.get(id)
      return (
        dependencia !== undefined &&
        dependencia.ambienteId === tarea.ambienteId &&
        RE_SECO.test(texto(dependencia))
      )
    })
    if (!tieneSeco) {
      problemas.push(
        `seco antes que húmedo: tarea ${tarea.id}: "${texto(tarea)}" no declara depender de una tarea de barrer o aspirar del ambiente ${tarea.ambienteId}`,
      )
    }
  }

  return problemas
}
