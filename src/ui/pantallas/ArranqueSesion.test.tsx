import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useParams } from 'react-router'
import { beforeEach, expect, test } from 'vitest'
import ArranqueSesion from './ArranqueSesion'
import { useSesion } from '../estado/sesion'
import { crearRepositorioLocal } from '../../data/repositorioLocal'
import { ambientePorId, tareasDeAmbiente } from '../../domain/catalogo'
import type { Repositorio } from '../../data/repositorio'

/*
  El arranque de la sesión: cuánto tiempo hay y con qué criterio ordenar.

  Acá nace el plan, y es el único lugar de la app donde se consulta el reloj y se
  inventa un identificador: el motor es puro y recibe los dos por parámetro.
*/

let repo: Repositorio
let contador = 0

async function sembrar(conTareas: boolean): Promise<void> {
  const cocina = ambientePorId('cocina')!
  await repo.guardarAmbiente(cocina)
  if (conTareas) {
    for (const tarea of tareasDeAmbiente('cocina')) await repo.guardarTarea(tarea)
  }
  useSesion.setState({ repositorio: repo, ambientes: [cocina], planActual: null, pasoActual: 0 })
}

beforeEach(() => {
  contador += 1
  repo = crearRepositorioLocal(`sesion-${contador}`)
})

function DestinoDelPlan() {
  const { planId } = useParams()
  return <p>estoy en el plan {planId}</p>
}

function montar() {
  return render(
    <MemoryRouter initialEntries={['/sesion/nueva']}>
      <Routes>
        <Route path="/sesion/nueva" element={<ArranqueSesion />} />
        <Route path="/plan/:planId" element={<DestinoDelPlan />} />
      </Routes>
    </MemoryRouter>,
  )
}

const valoresDe = (nombre: string) =>
  screen
    .getAllByRole('radio')
    .filter((radio) => radio.getAttribute('name') === nombre)
    .map((radio) => radio.getAttribute('value'))

test('ofrece 10, 20, 30, 60 minutos y sin límite', async () => {
  await sembrar(true)
  montar()
  expect(await screen.findByRole('radio', { name: /10 minutos/i })).toBeInTheDocument()
  expect(valoresDe('tiempo')).toEqual(['10', '20', '30', '60', 'sinLimite'])
})

test('«Arrancar ya» viene preseleccionado y explicado en una línea', async () => {
  await sembrar(true)
  montar()
  expect(await screen.findByRole('radio', { name: /arrancar ya/i })).toBeChecked()
  expect(screen.getByText(/victoria rápida/i)).toBeInTheDocument()
  expect(valoresDe('modo')).toEqual(['arrancarYa', 'ambientePorAmbiente', 'puestaAPunto'])
})

test('el botón dice exactamente lo que va a pasar', async () => {
  await sembrar(true)
  montar()
  expect(await screen.findByRole('button', { name: 'Armá el plan' })).toBeInTheDocument()
})

test('genera el plan, lo guarda y navega a su ruta', async () => {
  await sembrar(true)
  const usuario = userEvent.setup()
  montar()

  await usuario.click(await screen.findByRole('radio', { name: /20 minutos/i }))
  await usuario.click(screen.getByRole('button', { name: 'Armá el plan' }))

  expect(await screen.findByText(/estoy en el plan/i)).toBeInTheDocument()

  const plan = await repo.ultimoPlan()
  expect(plan).not.toBeNull()
  expect(plan?.modo).toBe('arrancarYa')
  expect(plan?.presupuestoSegundos).toBe(1200)
  expect(plan?.pasos.length).toBeGreaterThan(0)
})

test('sin límite no guarda presupuesto', async () => {
  await sembrar(true)
  const usuario = userEvent.setup()
  montar()

  await usuario.click(await screen.findByRole('radio', { name: /sin límite/i }))
  await usuario.click(screen.getByRole('button', { name: 'Armá el plan' }))

  expect(await screen.findByText(/estoy en el plan/i)).toBeInTheDocument()
  expect((await repo.ultimoPlan())?.presupuestoSegundos).toBeNull()
})

test('respeta el modo elegido', async () => {
  await sembrar(true)
  const usuario = userEvent.setup()
  montar()

  await usuario.click(await screen.findByRole('radio', { name: /puesta a punto/i }))
  await usuario.click(screen.getByRole('button', { name: 'Armá el plan' }))

  expect(await screen.findByText(/estoy en el plan/i)).toBeInTheDocument()
  expect((await repo.ultimoPlan())?.modo).toBe('puestaAPunto')
})

test('no deja armar un plan sin ninguna tarea, y lo explica', async () => {
  // Caso 2 de Review Focus.
  await sembrar(false)
  montar()
  // Se espera a la explicación, que es la señal de que terminó de mirar: el botón
  // existe desde el primer render y podría estar deshabilitado solo por estar cargando.
  expect(await screen.findByText(/no hay ninguna tarea/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Armá el plan' })).toBeDisabled()
})
