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
import { generarPlan } from './domain/motor/generarPlan'
import { esPlaylistValida, opcionesDeMusica } from './ui/musica'
import type { Repositorio } from './data/repositorio'

/*
  Los últimos ítems de docs/checklist-producto.md: la primera pantalla para quien
  llega, los vacíos de Armado, la playlist validada, los topes de largo, Ctrl+Enter
  y la marca de menta que deja «Listo».
*/

let repo: Repositorio
let contador = 0

beforeEach(() => {
  contador += 1
  repo = crearRepositorioLocal(`tanda-final-${contador}`)
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

async function sembrar(ambienteId: string) {
  await repo.guardarAmbiente(ambientePorId(ambienteId)!)
  for (const tarea of tareasDeAmbiente(ambienteId)) await repo.guardarTarea(tarea)
}

test('quien llega por primera vez lee qué es la app', async () => {
  montar('/')
  expect(await screen.findByText(/no tenés que ordenar todo, solo lo siguiente/i)).toBeInTheDocument()
})

test('a quien vuelve no se le repite la explicación', async () => {
  await sembrar('cocina')
  montar('/')
  await waitFor(() => expect(screen.getByRole('checkbox', { name: /cocina/i })).toBeChecked())
  expect(screen.queryByText(/no tenés que ordenar todo/i)).not.toBeInTheDocument()
})

test('un ambiente que no existe se dice, y ofrece elegir otro', async () => {
  montar('/armar/no-existe')
  expect(await screen.findByRole('heading', { level: 1, name: /no encontramos ese ambiente/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /elegí ambientes/i })).toHaveAttribute('href', '/')
  expect(screen.queryByRole('button', { name: /cuánto tiempo/i })).not.toBeInTheDocument()
  expect(document.title).toMatch(/no encontramos ese ambiente/i)
})

test('con todo destildado, Armado avisa que el ambiente no va a entrar en el plan', async () => {
  const usuario = userEvent.setup()
  await sembrar('bano')
  montar('/armar/bano')

  const casillas = await screen.findAllByRole('checkbox')
  for (const casilla of casillas) await usuario.click(casilla)

  expect(await screen.findByText(/no quedó nada tildado en baño/i)).toBeInTheDocument()
})

test('los campos de texto tienen tope de largo', async () => {
  montar('/armar/cocina')
  expect(await screen.findByLabelText(/agregar algo mío/i)).toHaveAttribute('maxlength', '200')
  expect(screen.getByLabelText(/contá lo que ves/i)).toHaveAttribute('maxlength', '1000')
})

test('Ctrl+Enter en «Contá lo que ves» pide ideas', async () => {
  const usuario = userEvent.setup()
  montar('/armar/cocina')

  await usuario.type(await screen.findByLabelText(/contá lo que ves/i), 'ropa tirada{Control>}{Enter}{/Control}')

  // Sin clave configurada, pedir ideas explica qué falta: es la prueba de que se pidió.
  expect(await screen.findByText(/primero hay que configurar la clave/i)).toBeInTheDocument()
})

test.each([
  ['https://open.spotify.com/playlist/abc', true],
  ['https://www.youtube.com/playlist?list=abc', true],
  ['https://youtu.be/abc', true],
  ['http://open.spotify.com/playlist/abc', false],
  ['javascript:alert(1)', false],
  ['https://open.spotify.com.sitio-falso.com/playlist', false],
  ['no es una dirección', false],
])('esPlaylistValida(%s) es %s', (direccion, esperado) => {
  expect(esPlaylistValida(direccion)).toBe(esperado)
})

test('una playlist guardada que no es válida no se ofrece como enlace', () => {
  // Pudo llegar en una copia importada de otro teléfono, antes de que existiera la validación.
  const opciones = opcionesDeMusica(20, 'javascript:alert(1)')
  expect(opciones.map((opcion) => opcion.nombre)).not.toContain('Tu playlist')
})

test('una playlist que no es de Spotify ni YouTube se explica junto al campo y no se guarda', async () => {
  const usuario = userEvent.setup()
  montar('/ajustes')

  const campo = await screen.findByLabelText(/tu música, si querés/i)
  await usuario.type(campo, 'javascript:alert(1)')
  await usuario.click(screen.getByRole('button', { name: /guardá la playlist/i }))

  expect(campo).toHaveAccessibleDescription(/tiene que ser un enlace de spotify o youtube/i)
  expect(campo).toHaveAttribute('aria-invalid', 'true')
  expect(campo).toHaveFocus()
  expect((await repo.preferencias()).playlistPropia).toBeNull()
})

test('una playlist válida se guarda', async () => {
  const usuario = userEvent.setup()
  montar('/ajustes')

  await usuario.type(await screen.findByLabelText(/tu música, si querés/i), 'https://open.spotify.com/playlist/mia')
  await usuario.click(screen.getByRole('button', { name: /guardá la playlist/i }))

  expect(await screen.findByText(/la playlist quedó guardada/i)).toBeInTheDocument()
  expect((await repo.preferencias()).playlistPropia).toBe('https://open.spotify.com/playlist/mia')
})

test('«Listo» deja una marca de menta en la línea de progreso, y lo salteado no', async () => {
  const usuario = userEvent.setup()
  await sembrar('cocina')
  const { plan } = generarPlan(
    {
      ambientes: [ambientePorId('cocina')!],
      tareas: tareasDeAmbiente('cocina'),
      hechasEnCiclo: [],
      presupuestoMin: 30,
      modo: 'arrancarYa',
      herramientasDisponibles: ['escoba', 'trapo', 'balde', 'detergente'],
    },
    '2026-10-10T21:00:00.000Z',
    `plan-marcas-${contador}`,
  )
  await repo.guardarPlan(plan)
  const { container } = montar(`/plan/${plan.id}`)
  await screen.findByRole('article')

  await usuario.click(screen.getByRole('button', { name: 'Listo' }))
  await waitFor(() => expect(useSesion.getState().pasoActual).toBe(1))
  await usuario.click(screen.getByRole('button', { name: 'Salteá' }))
  await waitFor(() => expect(useSesion.getState().pasoActual).toBe(2))

  const marcas = container.querySelectorAll('.progreso__marca')
  expect(marcas).toHaveLength(plan.pasos.length)
  expect(marcas[0]).toHaveClass('progreso__marca--hecho')
  expect(marcas[1]).toHaveClass('progreso__marca--salteado')
  expect(marcas[2]).toHaveClass('progreso__marca--actual')
})
