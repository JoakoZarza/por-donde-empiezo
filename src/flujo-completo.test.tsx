import 'fake-indexeddb/auto'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, expect, test } from 'vitest'
import { RUTAS } from './App'
import { useSesion } from './ui/estado/sesion'
import { crearRepositorioLocal } from './data/repositorioLocal'
import type { Repositorio } from './data/repositorio'

/*
  El flujo completo, con la interfaz real y la base real, sin dobles.

  Es la prueba más cercana a «usar la app» que se puede correr sin un teléfono: si
  este test pasa, una persona puede llegar del principio al primer paso tildado sin
  escribir una dirección a mano. Es la clase de defecto que ningún test de pantalla
  suelta detecta, porque cada pantalla puede estar bien y el camino entre ellas no.
*/

let repo: Repositorio
let contador = 0

beforeEach(() => {
  contador += 1
  repo = crearRepositorioLocal(`flujo-${contador}`)
  useSesion.setState({ repositorio: repo, ambientes: [], planActual: null, pasoActual: 0 })
})

function montar() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        {RUTAS.map((ruta) => (
          <Route key={ruta.path} path={ruta.path} element={ruta.element} />
        ))}
      </Routes>
    </MemoryRouter>,
  )
}

test('de elegir ambientes a tildar el primer paso, sin escribir ninguna dirección', async () => {
  const usuario = userEvent.setup()
  montar()

  // 1. Elegir un ambiente y avanzar.
  await usuario.click(screen.getByRole('checkbox', { name: /cocina/i }))
  await usuario.click(screen.getByRole('button', { name: /armá las tareas/i }))

  // 2. El armado del ambiente, con las tareas agrupadas por objeto.
  expect(await screen.findByRole('heading', { name: /mesada/i })).toBeInTheDocument()

  // 3. Desde acá tiene que poder seguir sola: si no hay botón, el flujo está cortado.
  await usuario.click(screen.getByRole('button', { name: /cuánto tiempo/i }))

  // 4. Elegir el tiempo y armar el plan. El botón se habilita recién cuando la
  // pantalla terminó de mirar si quedan tareas pendientes: hay que esperarlo.
  await usuario.click(await screen.findByRole('radio', { name: /20 minutos/i }))
  const armar = screen.getByRole('button', { name: 'Armá el plan' })
  await waitFor(() => expect(armar).toBeEnabled())
  await usuario.click(armar)

  // 5. El plan muestra un solo paso, y el primero dura dos minutos.
  const articulo = await screen.findByRole('article')
  expect(articulo).toHaveTextContent(/2&nbsp;min|2 min/)

  // 6. Tildar el primer paso lo deja registrado en el plan guardado.
  await usuario.click(screen.getByRole('button', { name: 'Listo' }))
  // Si la pantalla hubiera fallado al guardar, mostraría un aviso: se comprueba
  // antes de mirar la base, para saber si el problema es el guardado o la lectura.
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  // El guardado es asíncrono y el clic no espera a las promesas del manejador.
  await waitFor(async () => {
    expect((await repo.ultimoPlan())?.pasos[0]?.estado).toBe('hecho')
  })
})

test('el plan sobrevive a recargar la página', async () => {
  const usuario = userEvent.setup()
  const primero = montar()

  await usuario.click(screen.getByRole('checkbox', { name: /cocina/i }))
  await usuario.click(screen.getByRole('button', { name: /armá las tareas/i }))
  await usuario.click(await screen.findByRole('button', { name: /cuánto tiempo/i }))
  await usuario.click(await screen.findByRole('radio', { name: /20 minutos/i }))
  const armar = screen.getByRole('button', { name: 'Armá el plan' })
  await waitFor(() => expect(armar).toBeEnabled())
  await usuario.click(armar)
  // El guardado ocurre dentro del manejador del clic, y `click` no espera a las
  // promesas del manejador: hay que esperar a que el plan exista antes de leerlo.
  await waitFor(async () => {
    expect(await repo.ultimoPlan()).not.toBeNull()
  })
  const plan = await repo.ultimoPlan()

  // Se desmonta todo y se vuelve a montar directo en la dirección del plan: es lo
  // que pasa al recargar o al abrir la app desde el ícono.
  primero.unmount()
  useSesion.setState({ planActual: null, pasoActual: 0 })
  render(
    <MemoryRouter initialEntries={[`/plan/${plan?.id ?? ''}`]}>
      <Routes>
        {RUTAS.map((ruta) => (
          <Route key={ruta.path} path={ruta.path} element={ruta.element} />
        ))}
      </Routes>
    </MemoryRouter>,
  )

  expect(await screen.findByRole('article')).toBeInTheDocument()
  expect(screen.getByText(/1 de \d+/)).toBeInTheDocument()
})
