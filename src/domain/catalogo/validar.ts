import { TIPOS_AMBIENTE, VERBOS } from '../tipos'
import type { Ambiente, Objeto, Tarea } from '../tipos'

/*
  Valida las obligaciones de integridad del catálogo (especificación, sección 5.4).
  Devuelve la lista de problemas encontrados; vacía si el catálogo está bien.
  Nunca lanza excepciones: un catálogo roto es un dato, no un accidente.

  Formato de los mensajes: los problemas de una tarea empiezan siempre con
  `tarea <id>:`, y los de un ambiente con `ambiente <id>:`. Es lo que permite que
  los tests afirmen sobre un problema concreto y no sobre el texto en general.

  Dos de las tres reglas de dependencia se comprueban acá: «seco antes que húmedo»
  y «arriba antes que abajo». La tercera, «sacar antes que limpiar», depende de la
  redacción y queda como garantía de autoría.

  «Arriba antes que abajo» se comprobaba a mano hasta que un plan real mostró que
  el catálogo la violaba: la cocina trapeaba el piso antes de limpiar las hornallas
  y lavar los platos. Se puede verificar con los datos que ya existen —el piso es un
  objeto con nombre— y ahora se verifica.
*/

/*
  Las expresiones se escriben sin la terminación del verbo a propósito: el
  catálogo guarda el imperativo en voseo («Barré», «Trapeá»), y buscar «barrer»
  literal no encontraría «Barré».
*/
const RE_HUMEDO = /trap|fregar el piso|lavar el piso|lavar el suelo|baldear/i
const RE_SECO = /barr|aspir|escob/i
const RE_PISO = /piso/i

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

/** Todas las tareas que hay que hacer antes que esta, siguiendo las dependencias. */
function alcanzablesDesde(id: string, porId: Map<string, Tarea>): Set<string> {
  const vistos = new Set<string>()
  const pendientes = [id]

  while (pendientes.length > 0) {
    const actual = pendientes.pop()
    if (actual === undefined) break
    for (const dependencia of porId.get(actual)?.requiere ?? []) {
      if (vistos.has(dependencia) || !porId.has(dependencia)) continue
      vistos.add(dependencia)
      pendientes.push(dependencia)
    }
  }

  return vistos
}

function validarArribaAntesQueAbajo(
  ambientes: Ambiente[],
  tareas: Tarea[],
  objetos: Objeto[],
  porId: Map<string, Tarea>,
  problemas: string[],
): void {
  const objetoPorId = new Map(objetos.map((objeto) => [objeto.id, objeto]))

  const esDelPiso = (tarea: Tarea): boolean => {
    if (tarea.objetoId === null) return false
    const objeto = objetoPorId.get(tarea.objetoId)
    return objeto !== undefined && RE_PISO.test(objeto.nombre)
  }

  for (const ambiente of ambientes) {
    const delAmbiente = tareas.filter((tarea) => tarea.ambienteId === ambiente.id)

    // Limpiar el piso: barrer, trapear, baldear. No cuenta juntar cosas del piso,
    // que es una tarea de otro tipo y puede ir primero.
    const limpiezaDelPiso = delAmbiente.filter(
      (tarea) => esDelPiso(tarea) && (tarea.verbo === 'limpiar' || tarea.verbo === 'lavar'),
    )
    // Superficies elevadas: todo lo que se trabaja sobre un objeto que no es el piso.
    const elevadas = delAmbiente.filter((tarea) => tarea.objetoId !== null && !esDelPiso(tarea))

    if (limpiezaDelPiso.length === 0 || elevadas.length === 0) continue

    for (const delPiso of limpiezaDelPiso) {
      const anteriores = alcanzablesDesde(delPiso.id, porId)
      for (const elevada of elevadas) {
        if (anteriores.has(elevada.id)) continue
        problemas.push(
          `arriba antes que abajo: tarea ${delPiso.id}: "${texto(delPiso)}" no depende, ni directa ni indirectamente, de la tarea ${elevada.id} ("${texto(elevada)}"), que trabaja una superficie elevada del mismo ambiente`,
        )
      }
    }
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

  validarArribaAntesQueAbajo(ambientes, tareas, objetos, porId, problemas)

  return problemas
}
