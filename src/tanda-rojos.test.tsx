import 'fake-indexeddb/auto'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, expect, test } from 'vitest'
import { Rutas } from './App'
import { useSesion } from './ui/estado/sesion'
import { useAvisos } from './ui/estado/avisos'
import { crearRepositorioLocal } from './data/repositorioLocal'
import { ambientePorId, tareasDeAmbiente } from './domain/catalogo'
import { generarPlan } from './domain/motor/generarPlan'
import type { Repositorio } from './data/repositorio'

/*
  Los ítems rojos que quedaban en docs/checklist-producto.md: quien vuelve
  encontraba la selección vacía, «Saltear» no tenía vuelta, borrar todo dependía de
  `window.confirm`, y los selectores de archivo eran los nativos.

  Se monta `Rutas` entero, y no una pantalla suelta, porque los avisos y el diálogo
  viven por encima de las pantallas.
*/

let repo: Repositorio
let contador = 0

beforeEach(() => {
  contador += 1
  repo = crearRepositorioLocal(`tanda-rojos-${contador}`)
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

test('quien vuelve encuentra tildados los ambientes que ya había elegido', async () => {
  await sembrar('cocina')
  montar('/')

  const cocina = await screen.findByRole('checkbox', { name: /cocina/i })
  // Las fichas se dibujan antes de leer el teléfono, y se tildan cuando llega.
  await waitFor(() => expect(cocina).toBeChecked())
  expect(screen.getByRole('checkbox', { name: /baño/i })).not.toBeChecked()
  expect(screen.getByRole('button', { name: /armá las tareas/i })).toBeEnabled()
})

test('destildar un ambiente de antes lo saca del recorrido, pero sus tareas quedan guardadas', async () => {
  const usuario = userEvent.setup()
  await sembrar('cocina')
  montar('/')

  const cocina = await screen.findByRole('checkbox', { name: /cocina/i })
  await waitFor(() => expect(cocina).toBeChecked())
  await usuario.click(cocina)
  await usuario.click(screen.getByRole('checkbox', { name: /baño/i }))
  await usuario.click(screen.getByRole('button', { name: /armá las tareas/i }))

  await waitFor(async () => {
    const ids = (await repo.listarAmbientes()).map((ambiente) => ambiente.id)
    expect(ids).toEqual(['bano'])
  })
  expect((await repo.listarTareas('cocina')).length).toBe(tareasDeAmbiente('cocina').length)
})

test('volver a elegir un ambiente no resucita las tareas que se habían destildado', async () => {
  await sembrar('cocina')
  const [primera] = tareasDeAmbiente('cocina')
  await repo.eliminarTarea(primera!.id)

  // Lo saca del recorrido y lo vuelve a elegir.
  await useSesion.getState().elegirAmbientes([])
  await useSesion.getState().elegirAmbientes(['cocina'])

  const ids = (await repo.listarTareas('cocina')).map((tarea) => tarea.id)
  expect(ids).not.toContain(primera!.id)
})

test('«Saltear» ofrece deshacer, y deshacer vuelve a la misma tarea', async () => {
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
    `plan-salteo-${contador}`,
  )
  await repo.guardarPlan(plan)
  montar(`/plan/${plan.id}`)

  await screen.findByRole('article')
  const titulo = screen.getByRole('heading', { level: 2 }).textContent ?? ''
  await usuario.click(screen.getByRole('button', { name: 'Saltear' }))

  expect(await screen.findByText(/^Salteaste/, {}, { timeout: 3000 })).toBeInTheDocument()
  await usuario.click(screen.getByRole('button', { name: 'Deshacer' }))

  await waitFor(() => expect(useSesion.getState().pasoActual).toBe(0), { timeout: 3000 })
  await waitFor(() => expect(screen.getByRole('article').textContent).toContain(titulo), { timeout: 3000 })
  expect(useSesion.getState().planActual?.pasos[0]?.estado).toBe('pendiente')
  // Y quedó guardado así: recargar no trae de vuelta el salteo.
  expect((await repo.obtenerPlan(plan.id))?.pasos[0]?.estado).toBe('pendiente')
})

test('«Empezar de cero» pide confirmar en un diálogo propio, y cancelar no borra nada', async () => {
  const usuario = userEvent.setup()
  await sembrar('cocina')
  montar('/ajustes')

  await usuario.click(await screen.findByRole('button', { name: /empezar de cero en este teléfono/i }))

  const dialogo = await screen.findByRole('dialog', { name: /empezar de cero/i })
  // El foco arranca en la opción segura.
  expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toHaveFocus()
  await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))

  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(await repo.listarAmbientes()).toHaveLength(1)
})

test('confirmar «Borrar todo» sí borra, y lo dice junto a la sección', async () => {
  const usuario = userEvent.setup()
  await sembrar('cocina')
  montar('/ajustes')

  await usuario.click(await screen.findByRole('button', { name: /empezar de cero en este teléfono/i }))
  const dialogo = await screen.findByRole('dialog', { name: /empezar de cero/i })
  await usuario.click(within(dialogo).getByRole('button', { name: 'Borrar todo' }))

  expect(await screen.findByText(/este teléfono quedó en cero/i)).toBeInTheDocument()
  expect(await repo.listarAmbientes()).toHaveLength(0)
})

test('«Arrancar de nuevo» pide confirmación antes de reabrir el ciclo', async () => {
  const usuario = userEvent.setup()
  await sembrar('cocina')
  for (const tarea of tareasDeAmbiente('cocina')) await repo.marcarHecha(tarea.id, '2026-10-10T21:00:00.000Z')
  montar('/sesion/nueva')

  await usuario.click(await screen.findByRole('button', { name: /arrancar de nuevo/i }))
  const dialogo = await screen.findByRole('dialog', { name: /arrancar de nuevo/i })
  await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))

  expect((await repo.listarHechas('cocina')).length).toBe(tareasDeAmbiente('cocina').length)
})

test('agregar una tarea propia lo confirma con un aviso', async () => {
  const usuario = userEvent.setup()
  montar('/armar/cocina')

  await usuario.type(await screen.findByLabelText(/agregar algo mío/i), 'Regar las plantas{Enter}')

  expect(await screen.findByText(/agregaste «regar las plantas»/i)).toBeInTheDocument()
})

test('los selectores de archivo tienen nombre y siguen siendo un input de archivo', async () => {
  montar('/ajustes')

  const copia = await screen.findByLabelText(/traer de otra copia/i)
  expect(copia).toHaveAttribute('type', 'file')
  expect(copia).toHaveAttribute('accept', 'application/json,.json')
})

test('mientras carga, Tu casa muestra la silueta del plano y lo anuncia', async () => {
  let soltar: () => void = () => {}
  const espera = new Promise<void>((resolver) => {
    soltar = resolver
  })
  useSesion.setState({
    repositorio: { ...repo, listarAmbientes: async () => (await espera, repo.listarAmbientes()) },
  })
  const { container } = montar('/casa')

  expect(await screen.findByText('Cargando…')).toBeInTheDocument()
  expect(container.querySelectorAll('.casa .esqueleto__bloque')).toHaveLength(8)

  soltar()
  expect(await screen.findByText(/todavía no elegiste ningún ambiente/i)).toBeInTheDocument()
})
