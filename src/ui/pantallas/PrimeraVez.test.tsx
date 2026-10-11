import 'fake-indexeddb/auto'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, expect, test } from 'vitest'
import PrimeraVez from './PrimeraVez'
import { useSesion } from '../estado/sesion'
import { crearRepositorioLocal } from '../../data/repositorioLocal'
import type { Repositorio } from '../../data/repositorio'

/*
  La primera pantalla. Sin registro, sin tutorial: elegir ambientes y seguir.
  Al avanzar se copian al teléfono el ambiente y sus tareas del catálogo: desde
  ahí, lo que la persona destilde es una decisión suya y sobrevive.
*/

let repo: Repositorio
let contador = 0

beforeEach(() => {
  contador += 1
  repo = crearRepositorioLocal(`primera-vez-${contador}`)
  useSesion.setState({ repositorio: repo, ambientes: [], planActual: null, pasoActual: 0 })
})

function montar() {
  return render(
    <MemoryRouter>
      <PrimeraVez />
    </MemoryRouter>,
  )
}

test('muestra una ficha por cada ambiente del catálogo', () => {
  montar()
  expect(screen.getAllByRole('checkbox')).toHaveLength(8)
})

test('las fichas se anuncian por su nombre, no por su id', () => {
  montar()
  expect(screen.getByRole('checkbox', { name: /cocina/i })).toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: /dormitorio/i })).toBeInTheDocument()
})

test('sin ningún ambiente elegido el avance está deshabilitado, y se explica por qué', () => {
  montar()
  expect(screen.getByRole('button', { name: /armá las tareas/i })).toBeDisabled()
  expect(screen.getByText(/elegí al menos un ambiente/i)).toBeInTheDocument()
})

test('elegir un ambiente habilita el avance y quita la explicación', async () => {
  const usuario = userEvent.setup()
  montar()

  await usuario.click(screen.getByRole('checkbox', { name: /cocina/i }))

  expect(screen.getByRole('button', { name: /armá las tareas/i })).toBeEnabled()
  expect(screen.queryByText(/elegí al menos un ambiente/i)).not.toBeInTheDocument()
})

test('se puede elegir y volver a destildar', async () => {
  const usuario = userEvent.setup()
  montar()
  const cocina = screen.getByRole('checkbox', { name: /cocina/i })

  await usuario.click(cocina)
  await usuario.click(cocina)

  expect(cocina).not.toBeChecked()
  expect(screen.getByRole('button', { name: /armá las tareas/i })).toBeDisabled()
})

test('al avanzar guarda el ambiente elegido y todas sus tareas', async () => {
  const usuario = userEvent.setup()
  montar()

  await usuario.click(screen.getByRole('checkbox', { name: /cocina/i }))
  await usuario.click(screen.getByRole('button', { name: /armá las tareas/i }))

  await waitFor(async () => {
    expect((await repo.listarAmbientes()).map((a) => a.id)).toEqual(['cocina'])
  })
  const tareas = await repo.listarTareas('cocina')
  expect(tareas.length).toBeGreaterThanOrEqual(5)
  expect(tareas.every((t) => t.esDelCatalogo)).toBe(true)
})

test('no guarda nada si no se eligió ningún ambiente', async () => {
  const usuario = userEvent.setup()
  montar()
  await usuario.click(screen.getByRole('button', { name: /armá las tareas/i })).catch(() => undefined)
  expect(await repo.listarAmbientes()).toEqual([])
})

test('no pide cuenta, ni correo, ni contraseña', () => {
  montar()
  expect(screen.queryByText(/contraseña|correo|registr|iniciar sesión/i)).not.toBeInTheDocument()
})
