import 'fake-indexeddb/auto'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, expect, test } from 'vitest'
import Plan from './Plan'
import { useSesion } from '../estado/sesion'
import { crearRepositorioLocal } from '../../data/repositorioLocal'
import { ambientePorId, tareasDeAmbiente } from '../../domain/catalogo'
import { generarPlan } from '../../domain/motor/generarPlan'
import type { Repositorio } from '../../data/repositorio'
import type { Modo, Plan as PlanDeDominio, Tarea } from '../../domain/tipos'

/*
  La pantalla central: una sola tarea, grande, y un solo botón. Todo lo demás que
  hay acá existe para que esa promesa se sostenga.
*/

let repo: Repositorio
let contador = 0

beforeEach(async () => {
  contador += 1
  repo = crearRepositorioLocal(`plan-${contador}`)
  const cocina = ambientePorId('cocina')!
  await repo.guardarAmbiente(cocina)
  for (const tarea of tareasDeAmbiente('cocina')) await repo.guardarTarea(tarea)
  useSesion.setState({ repositorio: repo, ambientes: [cocina], planActual: null, pasoActual: 0 })
})

async function generar(presupuestoMin: number | null = 30, modo: Modo = 'arrancarYa') {
  const ambientes = await repo.listarAmbientes()
  const tareas: Tarea[] = []
  for (const ambiente of ambientes) tareas.push(...(await repo.listarTareas(ambiente.id)))

  const { plan } = generarPlan(
    { ambientes, tareas, hechasEnCiclo: [], presupuestoMin, modo, herramientasDisponibles: ['escoba', 'trapo', 'balde', 'detergente'] },
    '2026-10-10T21:00:00.000Z',
    `plan-${contador}`,
  )
  await repo.guardarPlan(plan)
  return plan
}

async function planManual(pasos: string[]): Promise<PlanDeDominio> {
  const plan: PlanDeDominio = {
    id: `manual-${contador}`,
    creadoEn: '2026-10-10T21:00:00.000Z',
    modo: 'arrancarYa',
    presupuestoSegundos: 1200,
    pasos: pasos.map((tareaId) => ({ tareaId, estado: 'pendiente' as const, hechoEn: null })),
    cerradoEn: null,
    minutosFaltantes: 0,
    advertencias: pasos.length === 0 ? ['con 1 minutos no entra ninguna tarea: la más corta dura 2 minutos'] : [],
  }
  await repo.guardarPlan(plan)
  return plan
}

function montar(planId: string) {
  return render(
    <MemoryRouter initialEntries={[`/plan/${planId}`]}>
      <Routes>
        <Route path="/plan/:planId" element={<Plan />} />
        <Route path="/" element={<p>volví al principio</p>} />
        <Route path="/sesion/nueva" element={<p>eligiendo tiempo</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const tareaDe = async (id: string) => (await repo.listarTareas('cocina')).find((t) => t.id === id)!

test('muestra una sola tarea: la actual', async () => {
  const plan = await generar()
  montar(plan.id)
  expect(await screen.findByRole('article')).toBeInTheDocument()
  expect(screen.getAllByRole('article')).toHaveLength(1)
})

test('el verbo del paso va primero, como título de la tarjeta', async () => {
  const plan = await generar()
  montar(plan.id)
  const articulo = await screen.findByRole('article')
  const primera = await tareaDe(plan.pasos[0]!.tareaId)
  expect(articulo).toHaveTextContent(primera.accion)
  expect(screen.getByRole('heading', { name: new RegExp(primera.accion, 'i') })).toBeInTheDocument()
})

test('«Listo» avanza al paso siguiente', async () => {
  const usuario = userEvent.setup()
  const plan = await generar()
  montar(plan.id)
  await screen.findByRole('article')

  const segunda = await tareaDe(plan.pasos[1]!.tareaId)
  await usuario.click(screen.getByRole('button', { name: 'Listo' }))

  expect(await screen.findByRole('heading', { name: new RegExp(segunda.accion, 'i') })).toBeInTheDocument()
})

test('anuncia el paso nuevo con aria-live, porque la pantalla cambia sin navegar', async () => {
  const usuario = userEvent.setup()
  const plan = await generar()
  montar(plan.id)
  await screen.findByRole('article')

  const segunda = await tareaDe(plan.pasos[1]!.tareaId)
  const region = screen.getByRole('status')
  expect(region).toHaveAttribute('aria-live', 'polite')

  await usuario.click(screen.getByRole('button', { name: 'Listo' }))

  await waitFor(() => {
    expect(screen.getByRole('status')).toHaveTextContent(segunda.accion)
  })
})

test('«Listo» deja el paso como hecho en el plan guardado', async () => {
  const usuario = userEvent.setup()
  const plan = await generar()
  montar(plan.id)
  await screen.findByRole('article')

  await usuario.click(screen.getByRole('button', { name: 'Listo' }))

  await waitFor(async () => {
    const guardado = await repo.obtenerPlan(plan.id)
    expect(guardado?.pasos[0]?.estado).toBe('hecho')
    expect(guardado?.pasos[0]?.hechoEn).not.toBeNull()
  })
})

test('«Saltear» deja el paso como salteado y avanza', async () => {
  const usuario = userEvent.setup()
  const plan = await generar()
  montar(plan.id)
  await screen.findByRole('article')

  await usuario.click(screen.getByRole('button', { name: 'Saltear' }))

  await waitFor(async () => {
    const guardado = await repo.obtenerPlan(plan.id)
    expect(guardado?.pasos[0]?.estado).toBe('salteado')
  })
})

test('recuerda qué herramienta hace falta para el paso actual', async () => {
  // La tarea de trapear pide trapo y balde: es el caso real en el que la persona
  // necesita ir a buscarlos antes de empezar.
  await planManual(['cocina-trapear', 'cocina-barrer'])
  montar(`manual-${contador}`)
  const articulo = await screen.findByRole('article')
  expect(articulo).toHaveTextContent(/trapo/i)
  expect(articulo).toHaveTextContent(/balde/i)
})

test('al terminar el último paso muestra el cierre, y no un error', async () => {
  const usuario = userEvent.setup()
  await planManual(['cocina-tirar-basura'])
  montar(`manual-${contador}`)
  await screen.findByRole('article')

  await usuario.click(screen.getByRole('button', { name: 'Listo' }))

  expect(await screen.findByText(/terminaste lo que te propusiste/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /listo por hoy/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /seguir un rato más/i })).toBeInTheDocument()
})

test('si el plan quedó vacío explica por qué y ofrece seguir', async () => {
  // Casos 1 y 2 de Review Focus.
  await planManual([])
  montar(`manual-${contador}`)

  const explicacion = await screen.findByText(/minutos/i)
  expect(explicacion).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /seguir con más tiempo/i })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Listo' })).not.toBeInTheDocument()
})

test('«Reordenar» arma un plan nuevo con lo que queda', async () => {
  const usuario = userEvent.setup()
  const plan = await generar()
  montar(plan.id)
  await screen.findByRole('article')

  await usuario.click(screen.getByRole('button', { name: 'Reordenar' }))

  await waitFor(async () => {
    const ultimo = await repo.ultimoPlan()
    expect(ultimo?.id).not.toBe(plan.id)
    expect(ultimo?.pasos.length).toBeGreaterThan(0)
  })
})

test('la barra de progreso muestra el avance con números tabulares', async () => {
  const plan = await generar()
  montar(plan.id)
  await screen.findByRole('article')
  const progreso = screen.getByText(/1 de \d+/)
  expect(progreso).toHaveClass('tabular')
})
