import { construirGrafo } from './grafo'
import { elegirAmbienteDeArranque, elegirPasoDeArranque } from './arranque'
import { ordenarResto } from './ordenar'
import { recortarAlPresupuesto } from './presupuesto'
import type { EntradaPlan, Paso, Plan, ResultadoPlan, Tarea } from '../tipos'

/*
  Los siete pasos de la sección 5.2, ensamblados.

  El motor es PURO: no consulta el reloj ni el azar. La fecha y el identificador
  del plan entran por parámetro, y quien los inventa es la pantalla de arranque de
  sesión. Eso es lo que hace comprobable la garantía de determinismo (G5): misma
  entrada, mismo plan, siempre.

  Cuando algo no se puede hacer, el plan vuelve vacío CON una advertencia que lo
  explica. Nunca devuelve una lista vacía en silencio, y nunca lanza.
*/

function armarPlan(
  entrada: EntradaPlan,
  ahora: string,
  idPlan: string,
  conservadas: Tarea[],
  minutosFaltantes: number,
  advertencias: string[],
): ResultadoPlan {
  const pasos: Paso[] = conservadas.map((tarea) => ({
    tareaId: tarea.id,
    estado: 'pendiente',
    hechoEn: null,
  }))

  const plan: Plan = {
    id: idPlan,
    creadoEn: ahora,
    modo: entrada.modo,
    // Se guarda en segundos porque el temporizador del reto cuenta en segundos;
    // la conversión ocurre en este único lugar.
    presupuestoSegundos: entrada.presupuestoMin === null ? null : entrada.presupuestoMin * 60,
    pasos,
    cerradoEn: null,
    minutosFaltantes,
    advertencias,
  }

  return {
    plan,
    meta: {
      pasos: pasos.length,
      minutos: conservadas.reduce((total, tarea) => total + tarea.duracionMin, 0),
    },
  }
}

export function generarPlan(entrada: EntradaPlan, ahora: string, idPlan: string): ResultadoPlan {
  const advertencias: string[] = []

  // 1. Filtrar: lo que pide herramientas que no hay, y lo que ya está hecho.
  const yaHechas = new Set(entrada.hechasEnCiclo)
  const disponibles = entrada.tareas.filter(
    (tarea) =>
      !yaHechas.has(tarea.id) &&
      tarea.herramientas.every((herramienta) => entrada.herramientasDisponibles.includes(herramienta)),
  )

  if (disponibles.length === 0) {
    // El motivo cambia el mensaje: culpar a la persona por no haber tildado nada
    // cuando en realidad ya hizo todo es desconcertante y falso.
    const yaEstabanHechas =
      entrada.tareas.length > 0 && entrada.tareas.every((tarea) => yaHechas.has(tarea.id))
    advertencias.push(
      yaEstabanHechas
        ? 'ya hiciste todas las tareas de estos ambientes: reiniciá uno para volver a empezar'
        : 'no hay ninguna tarea para hacer con lo que hay: revisá las tareas incluidas y las herramientas que tenés cargadas',
    )
    return armarPlan(entrada, ahora, idPlan, [], 0, advertencias)
  }

  // 2. Grafo de dependencias, con los ciclos ya resueltos y reportados.
  const { pendientesDe, advertencias: advertenciasDelGrafo } = construirGrafo(disponibles)
  advertencias.push(...advertenciasDelGrafo)

  // 3. Por dónde empezar.
  const ambienteDeArranque = elegirAmbienteDeArranque(entrada, disponibles)
  if (ambienteDeArranque === null) {
    advertencias.push('no se pudo elegir por dónde empezar')
    return armarPlan(entrada, ahora, idPlan, [], 0, advertencias)
  }

  // 4. El primer paso: dos minutos o menos, sin dependencias pendientes.
  const tareasDelAmbiente = disponibles.filter((tarea) => tarea.ambienteId === ambienteDeArranque)
  const arranque = elegirPasoDeArranque(
    tareasDelAmbiente,
    pendientesDe,
    { ambienteAnterior: null, herramientasEnMano: [] },
    entrada.modo,
  )
  if (arranque === null) {
    advertencias.push('no se pudo elegir el primer paso')
    return armarPlan(entrada, ahora, idPlan, [], 0, advertencias)
  }
  if (arranque.advertencia) advertencias.push(arranque.advertencia)

  // 5. Ordenar el resto y anteponer el arranque. El paso de arranque se excluye
  //    del conjunto que se ordena para que no pueda aparecer dos veces.
  const resto = disponibles.filter((tarea) => tarea.id !== arranque.tarea.id)
  const ordenado = ordenarResto({
    tareas: resto,
    ambientes: entrada.ambientes,
    pendientesDe,
    modo: entrada.modo,
    ambienteDeArranque,
    herramientasEnMano: arranque.tarea.herramientas,
  })
  const secuencia = [arranque.tarea, ...ordenado]

  // 6. Recortar al tiempo disponible.
  const recorte = recortarAlPresupuesto(secuencia, pendientesDe, entrada.presupuestoMin)
  advertencias.push(...recorte.advertencias)

  // 7. Devolver el plan y la meta de la sesión.
  return armarPlan(entrada, ahora, idPlan, recorte.conservadas, recorte.minutosFaltantes, advertencias)
}
