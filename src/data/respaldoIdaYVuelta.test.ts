import 'fake-indexeddb/auto'
import { expect, test } from 'vitest'
import { crearRepositorioLocal } from './repositorioLocal'
import { PREFERENCIAS_POR_DEFECTO } from './repositorio'
import { ambientePorId, tareasDeAmbiente } from '../domain/catalogo'
import { calcularTotales } from '../domain/logros'
import { leerRespaldo } from '../domain/respaldo'

/*
  Llevar el trabajo de un teléfono a otro, de verdad.

  Esto es lo que el dominio solo no puede probar: que las filas entren y salgan de
  IndexedDB sin perder nada por el camino. Es la prueba que convierte «exportar e
  importar» en una función de la que se puede fiar, y se hace con la base real, no
  con un doble.
*/

let contador = 0
function repositorio() {
  contador += 1
  return crearRepositorioLocal(`respaldo-${contador}`)
}

const COCINA = ambientePorId('cocina')!
const TAREAS = tareasDeAmbiente('cocina')
const DIA1 = '2026-10-10T21:00:00.000Z'
const DIA2 = '2026-10-12T21:00:00.000Z'

async function sembrarOrigen() {
  const repo = repositorio()
  await repo.guardarAmbiente(COCINA)
  for (const tarea of TAREAS.slice(0, 4)) await repo.guardarTarea(tarea)
  await repo.marcarHecha(TAREAS[0]!.id, DIA1)
  await repo.marcarHecha(TAREAS[1]!.id, DIA2)
  await repo.guardarPreferencias({ ...PREFERENCIAS_POR_DEFECTO, playlistPropia: 'https://open.spotify.com/playlist/abc' })
  return repo
}

test('el trabajo viaja entero: ambientes, tareas, historial y ajustes', async () => {
  const origen = await sembrarOrigen()
  const respaldo = await origen.exportar()

  // El camino real: se escribe como texto, se lee como texto, y recién ahí se importa.
  const destino = repositorio()
  await destino.importar(leerRespaldo(JSON.stringify(respaldo)))

  const totalesOrigen = calcularTotales(await origen.listarHistorial())
  const totalesDestino = calcularTotales(await destino.listarHistorial())

  expect(totalesDestino).toEqual(totalesOrigen)
  expect(totalesDestino.tareas).toBe(2)
  expect(totalesDestino.diasActivos).toBe(2)
  expect((await destino.listarAmbientes()).map((ambiente) => ambiente.id)).toEqual(['cocina'])
  expect(await destino.listarTareas('cocina')).toHaveLength(4)
  expect((await destino.preferencias()).playlistPropia).toBe('https://open.spotify.com/playlist/abc')
})

test('los totales que viajan incluyen las tareas hechas, no solo lo pendiente', async () => {
  const origen = await sembrarOrigen()
  const destino = repositorio()
  await destino.importar(leerRespaldo(JSON.stringify(await origen.exportar())))

  expect((await destino.listarHechas('cocina')).sort()).toEqual([TAREAS[0]!.id, TAREAS[1]!.id].sort())
  expect(calcularTotales(await destino.listarHistorial()).minutos).toBe(
    TAREAS[0]!.duracionMin + TAREAS[1]!.duracionMin,
  )
})

test('importar SUMA: lo que ya había en el teléfono no se toca', async () => {
  const destino = repositorio()
  const bano = ambientePorId('bano')!
  await destino.guardarAmbiente(bano)
  await destino.guardarTarea({ ...TAREAS[0]!, id: 'bano-propia', ambienteId: 'bano' })
  await destino.marcarHecha('bano-propia', DIA1)

  const origen = await sembrarOrigen()
  await destino.importar(leerRespaldo(JSON.stringify(await origen.exportar())))

  const ambientes = (await destino.listarAmbientes()).map((ambiente) => ambiente.id)
  expect(ambientes).toContain('bano')
  expect(ambientes).toContain('cocina')
  expect(calcularTotales(await destino.listarHistorial()).tareas).toBe(3)
})

test('importar dos veces la misma copia no duplica el trabajo', async () => {
  const origen = await sembrarOrigen()
  const texto = JSON.stringify(await origen.exportar())

  const destino = repositorio()
  await destino.importar(leerRespaldo(texto))
  await destino.importar(leerRespaldo(texto))

  expect(await destino.listarTareas('cocina')).toHaveLength(4)
  expect(calcularTotales(await destino.listarHistorial()).tareas).toBe(2)
  expect(await destino.listarAmbientes()).toHaveLength(1)
})

test('reiniciar el ciclo NO baja los totales: el historial es otra tabla', async () => {
  // Es la regla del producto, probada contra la base de verdad. Si alguien hace que
  // `limpiarHechas` toque el historial, los totales bajan y esto se pone en rojo.
  const repo = await sembrarOrigen()
  const antes = calcularTotales(await repo.listarHistorial())

  await repo.limpiarHechas('cocina')

  expect(await repo.listarHechas('cocina')).toEqual([])
  const despues = calcularTotales(await repo.listarHistorial())
  expect(despues).toEqual(antes)
  expect(despues.tareas).toBe(2)
})

test('borrar todo sí vacía el historial: es la acción destructiva explícita', async () => {
  const repo = await sembrarOrigen()
  await repo.borrarTodo()

  expect(await repo.listarHistorial()).toEqual([])
  expect(await repo.listarAmbientes()).toEqual([])
  expect(calcularTotales(await repo.listarHistorial()).tareas).toBe(0)
})

test('un respaldo de una base vacía se puede importar sin romper nada', async () => {
  const vacio = repositorio()
  const destino = repositorio()

  await destino.importar(leerRespaldo(JSON.stringify(await vacio.exportar())))

  expect(await destino.listarAmbientes()).toEqual([])
  expect(calcularTotales(await destino.listarHistorial()).tareas).toBe(0)
})

test('la clave de IA NUNCA viaja dentro de una copia', async () => {
  /*
    La copia está pensada para mandarse por WhatsApp o por correo. Que la clave de la
    persona viajara ahí adentro era la peor fuga posible, y encima contradecía el
    aviso que ella aceptó al activar la IA: «se manda únicamente a Google».
  */
  const repo = repositorio()
  await repo.guardarPreferencias({
    ...PREFERENCIAS_POR_DEFECTO,
    claveDeIa: 'AIzaSy-una-clave-secreta',
    avisoDePrivacidadAceptado: true,
  })

  const texto = JSON.stringify(await repo.exportar())

  // Precondición: sin esto, el test pasaría aunque la clave nunca se hubiera
  // guardado, que es la forma más común de escribir un test que no prueba nada.
  expect((await repo.preferencias()).claveDeIa).toBe('AIzaSy-una-clave-secreta')

  expect(texto).not.toContain('AIzaSy-una-clave-secreta')
  expect((await repo.exportar()).preferencias.claveDeIa).toBeNull()
  // Lo que sí tiene que viajar es lo demás.
  expect((await repo.exportar()).preferencias.avisoDePrivacidadAceptado).toBe(true)
})

test('importar completa los ajustes pero NO pisa los que ya estaban en el teléfono', async () => {
  const destino = repositorio()
  // Este teléfono ya tiene su configuración hecha a mano.
  await destino.guardarPreferencias({
    ...PREFERENCIAS_POR_DEFECTO,
    modoPorDefecto: 'puestaAPunto',
    herramientasDisponibles: ['escoba'],
  })

  const origen = repositorio()
  await origen.guardarPreferencias({
    ...PREFERENCIAS_POR_DEFECTO,
    modoPorDefecto: 'ambientePorAmbiente',
    playlistPropia: 'https://open.spotify.com/playlist/mia',
  })

  await destino.importar(leerRespaldo(JSON.stringify(await origen.exportar())))
  const quedaron = await destino.preferencias()

  // Lo configurado acá manda: importar nunca reemplaza.
  expect(quedaron.modoPorDefecto).toBe('puestaAPunto')
  expect(quedaron.herramientasDisponibles).toEqual(['escoba'])
  // Y lo que seguía en su valor de fábrica se completa con lo de la copia.
  expect(quedaron.playlistPropia).toBe('https://open.spotify.com/playlist/mia')
})

test('importar no le borra la clave de IA a este teléfono', async () => {
  const destino = repositorio()
  await destino.guardarPreferencias({
    ...PREFERENCIAS_POR_DEFECTO,
    claveDeIa: 'mi-clave-local',
    avisoDePrivacidadAceptado: true,
  })

  const origen = repositorio()
  await destino.importar(leerRespaldo(JSON.stringify(await origen.exportar())))

  expect((await destino.preferencias()).claveDeIa).toBe('mi-clave-local')
})
