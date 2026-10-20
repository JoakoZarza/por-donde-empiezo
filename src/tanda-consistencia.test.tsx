import 'fake-indexeddb/auto'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, expect, test } from 'vitest'
import { Rutas } from './App'
import { useSesion } from './ui/estado/sesion'
import { useAvisos } from './ui/estado/avisos'
import { crearRepositorioLocal } from './data/repositorioLocal'
import { ambientePorId, tareasDeAmbiente } from './domain/catalogo'
import type { Repositorio } from './data/repositorio'

/*
  La tanda de consistencia de docs/checklist-producto.md: un solo botón con carga
  para toda la app, y una sola jerarquía de títulos.
*/

let repo: Repositorio
let contador = 0

beforeEach(async () => {
  contador += 1
  repo = crearRepositorioLocal(`consistencia-${contador}`)
  await repo.guardarAmbiente(ambientePorId('cocina')!)
  for (const tarea of tareasDeAmbiente('cocina')) await repo.guardarTarea(tarea)
  useSesion.setState({ repositorio: repo, ambientes: [], planActual: null, pasoActual: 0 })
  useAvisos.setState({ aviso: null, confirmacion: null })
})

function montar(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Rutas />
    </MemoryRouter>,
  )
}

/** Una promesa que se resuelve cuando el test lo decide. */
function demora() {
  let soltar: () => void = () => {}
  const espera = new Promise<void>((resolver) => {
    soltar = resolver
  })
  return { espera, soltar }
}

test('mientras mira las tareas, «Armá el plan» conserva su nombre, espera y no se puede tocar', async () => {
  const { espera, soltar } = demora()
  useSesion.setState({
    repositorio: { ...repo, listarAmbientes: async () => (await espera, repo.listarAmbientes()) },
  })
  montar('/sesion/nueva')

  const boton = await screen.findByRole('button', { name: 'Armá el plan' })
  expect(boton).toHaveAttribute('aria-busy', 'true')
  expect(boton).toBeDisabled()

  soltar()
  await waitFor(() => expect(boton).toBeEnabled())
  expect(boton).toHaveAttribute('aria-busy', 'false')
  expect(boton).toHaveAccessibleName('Armá el plan')
})

test('el modo elegido a mano no lo pisa la preferencia que llega tarde', async () => {
  const usuario = userEvent.setup()
  await repo.guardarPreferencias({ ...(await repo.preferencias()), modoPorDefecto: 'puestaAPunto' })
  const { espera, soltar } = demora()
  useSesion.setState({
    repositorio: { ...repo, preferencias: async () => (await espera, repo.preferencias()) },
  })
  montar('/sesion/nueva')

  await usuario.click(await screen.findByRole('radio', { name: /ambiente por ambiente/i }))
  soltar()

  await waitFor(() => expect(screen.getByRole('button', { name: 'Armá el plan' })).toBeEnabled())
  expect(screen.getByRole('radio', { name: /ambiente por ambiente/i })).toBeChecked()
})

test('«Probá la clave» conserva su nombre mientras prueba', async () => {
  const usuario = userEvent.setup()
  await repo.guardarPreferencias({ ...(await repo.preferencias()), avisoDePrivacidadAceptado: true, versionAvisoIa: 2 })
  // La red no responde: el botón tiene que quedar esperando, no cambiar de nombre.
  const fetchOriginal = globalThis.fetch
  globalThis.fetch = () => new Promise(() => {})
  try {
    montar('/ajustes')
    await usuario.type(await screen.findByLabelText(/tu clave de google/i), 'clave-de-prueba')
    await usuario.click(screen.getByRole('button', { name: 'Probá la clave' }))

    const boton = screen.getByRole('button', { name: 'Probá la clave' })
    expect(boton).toHaveAttribute('aria-busy', 'true')
    expect(boton).toBeDisabled()
  } finally {
    globalThis.fetch = fetchOriginal
  }
})

test.each(['/ajustes', '/armar/cocina'])('en %s, todos los títulos de sección tienen el mismo estilo', async (ruta) => {
  const { container } = montar(ruta)
  await screen.findByRole('heading', { level: 1 })
  await waitFor(() => expect(container.querySelectorAll('h2, legend').length).toBeGreaterThan(1))

  for (const titulo of container.querySelectorAll('main h2, main legend')) {
    expect(titulo, titulo.textContent ?? '').toHaveClass('grupo__titulo')
  }
  // Y ninguno compite con el título de la pantalla.
  expect(container.querySelectorAll('main h2.pantalla__titulo')).toHaveLength(0)
})
