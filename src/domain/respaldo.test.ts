import { expect, test } from 'vitest'
import { armarRespaldo, leerRespaldo, nombreDelArchivo, RespaldoInvalido, VERSION_DEL_RESPALDO } from './respaldo'
import { PREFERENCIAS_POR_DEFECTO } from '../data/repositorio'
import type { DatosDelRespaldo } from './respaldo'

/*
  El respaldo.

  Leer un archivo que viene de afuera es leer algo que puede estar mal: el archivo
  equivocado, uno a medio bajar, o uno de otra versión. Cada caso tiene que tener su
  mensaje, porque el caso real es haber elegido el archivo que no era y quedarse
  mirando un «error al importar» que no ayuda a nadie.
*/

const VACIO: DatosDelRespaldo = {
  ambientes: [],
  tareas: [],
  hechas: [],
  historial: [],
  planes: [],
  preferencias: PREFERENCIAS_POR_DEFECTO,
}

test('el respaldo lleva su versión y su fecha', () => {
  const respaldo = armarRespaldo(VACIO, '2026-10-10T21:00:00.000Z')
  expect(respaldo.version).toBe(VERSION_DEL_RESPALDO)
  expect(respaldo.generadoEn).toBe('2026-10-10T21:00:00.000Z')
})

test('lo que se escribe se puede volver a leer igual', () => {
  const original = armarRespaldo(
    {
      ...VACIO,
      historial: [{ tareaId: 'cocina-barrer', ambienteId: 'cocina', minutos: 8, hechoEn: '2026-10-10T21:00:00.000Z' }],
      preferencias: { ...PREFERENCIAS_POR_DEFECTO, playlistPropia: 'https://open.spotify.com/playlist/abc' },
    },
    '2026-10-10T21:00:00.000Z',
  )

  const leido = leerRespaldo(JSON.stringify(original))
  expect(leido).toEqual(original)
})

test('un archivo que no es JSON lo dice sin culpar a la persona', () => {
  expect(() => leerRespaldo('esto no es json')).toThrow(RespaldoInvalido)
  expect(() => leerRespaldo('esto no es json')).toThrow(/no se entiende/i)
})

test('un archivo de otra versión dice cuál es y cuál se espera', () => {
  const futuro = JSON.stringify({ ...armarRespaldo(VACIO, '2026-10-10T21:00:00.000Z'), version: 99 })

  expect(() => leerRespaldo(futuro)).toThrow(/99/)
  expect(() => leerRespaldo(futuro)).toThrow(new RegExp(String(VERSION_DEL_RESPALDO)))
})

test('un archivo al que le falta una parte dice CUÁL le falta', () => {
  const sinHistorial = { version: VERSION_DEL_RESPALDO, generadoEn: 'x', ambientes: [], tareas: [], hechas: [], planes: [], preferencias: PREFERENCIAS_POR_DEFECTO }
  expect(() => leerRespaldo(JSON.stringify(sinHistorial))).toThrow(/historial/)
})

test('un archivo sin ajustes también se rechaza', () => {
  const sinPreferencias = { version: VERSION_DEL_RESPALDO, generadoEn: 'x', ambientes: [], tareas: [], hechas: [], historial: [], planes: [] }
  expect(() => leerRespaldo(JSON.stringify(sinPreferencias))).toThrow(/ajustes/i)
})

test('un JSON válido que no es un respaldo se rechaza', () => {
  expect(() => leerRespaldo('null')).toThrow(RespaldoInvalido)
  expect(() => leerRespaldo('42')).toThrow(RespaldoInvalido)
  expect(() => leerRespaldo('{}')).toThrow(RespaldoInvalido)
})

test('el nombre del archivo lleva la fecha, para reconocerlo después', () => {
  expect(nombreDelArchivo('2026-10-10T21:00:00.000Z')).toBe('por-donde-empiezo-2026-10-10.json')
})
