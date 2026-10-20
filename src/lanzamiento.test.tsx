import 'fake-indexeddb/auto'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { Rutas } from './App'
import { useSesion } from './ui/estado/sesion'
import { useAvisos } from './ui/estado/avisos'
import { crearRepositorioLocal } from './data/repositorioLocal'
import { almacenamientoEsPersistente, pedirAlmacenamientoPersistente } from './data/almacenamiento'

/*
  Lo que faltaba para lanzar, además de la checklist de diseño: la advertencia de IA
  de la especificación (sección 9.3) y que el navegador no borre los datos solo.
*/

let contador = 0

beforeEach(() => {
  contador += 1
  useSesion.setState({
    repositorio: crearRepositorioLocal(`lanzamiento-${contador}`),
    ambientes: [],
    planActual: null,
    pasoActual: 0,
  })
  useAvisos.setState({ aviso: null, confirmacion: null })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function montar(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Rutas />
    </MemoryRouter>,
  )
}

/** Un `navigator.storage` falso, con lo que el test necesite. */
function conAlmacenamiento(storage: Partial<StorageManager> | undefined) {
  vi.stubGlobal('navigator', { ...navigator, storage })
}

test('Ajustes muestra la advertencia de IA completa de la sección 9.3', async () => {
  montar('/ajustes')

  const aviso = await screen.findByRole('complementary', { name: /antes de usar la ia, leé esto/i })
  expect(aviso).toHaveTextContent(/fotos de tu casa/i)
  expect(aviso).toHaveTextContent(/personas revisoras pueden leerlo/i)
  expect(aviso).toHaveTextContent(/no mandes fotos donde aparezcan documentos, pantallas, personas/i)
  expect(aviso).toHaveTextContent(/solo en este teléfono/i)
  expect(aviso).toHaveTextContent(/podés usar la app completa sin activar esto/i)
})

test('activar la IA exige declarar ser mayor de 18', async () => {
  montar('/ajustes')
  expect(await screen.findByRole('checkbox', { name: /tengo 18 años o más/i })).not.toBeChecked()
})

test('pedir almacenamiento persistente devuelve lo que concede el navegador', async () => {
  const persist = vi.fn().mockResolvedValue(true)
  conAlmacenamiento({ persisted: vi.fn().mockResolvedValue(false), persist })

  expect(await pedirAlmacenamientoPersistente()).toBe(true)
  expect(persist).toHaveBeenCalledOnce()
})

test('si ya está concedido, no lo vuelve a pedir', async () => {
  const persist = vi.fn()
  conAlmacenamiento({ persisted: vi.fn().mockResolvedValue(true), persist })

  expect(await pedirAlmacenamientoPersistente()).toBe(true)
  expect(persist).not.toHaveBeenCalled()
})

test('sin la API, o si falla, no rompe nada', async () => {
  conAlmacenamiento(undefined)
  expect(await pedirAlmacenamientoPersistente()).toBe(false)
  expect(await almacenamientoEsPersistente()).toBeNull()

  conAlmacenamiento({ persisted: vi.fn().mockRejectedValue(new Error('no')), persist: vi.fn() })
  expect(await pedirAlmacenamientoPersistente()).toBe(false)
})

test('elegir ambientes pide almacenamiento persistente', async () => {
  const persist = vi.fn().mockResolvedValue(true)
  conAlmacenamiento({ persisted: vi.fn().mockResolvedValue(false), persist })

  await useSesion.getState().elegirAmbientes(['cocina'])

  await waitFor(() => expect(persist).toHaveBeenCalled())
})

test('si el navegador no protege los datos, Ajustes lo dice y explica cómo evitarlo', async () => {
  conAlmacenamiento({ persisted: vi.fn().mockResolvedValue(false), persist: vi.fn() })
  montar('/ajustes')

  expect(await screen.findByText(/este navegador puede borrar tus datos/i)).toHaveTextContent(
    /pantalla de inicio/i,
  )
})

test('si los datos están protegidos, no se muestra ninguna advertencia', async () => {
  conAlmacenamiento({ persisted: vi.fn().mockResolvedValue(true), persist: vi.fn() })
  montar('/ajustes')

  await screen.findByRole('heading', { name: 'Tus datos' })
  expect(screen.queryByText(/este navegador puede borrar tus datos/i)).not.toBeInTheDocument()
})
