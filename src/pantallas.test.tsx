import 'fake-indexeddb/auto'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, expect, test } from 'vitest'
import { RUTAS, Rutas } from './App'
import { useSesion } from './ui/estado/sesion'
import { crearRepositorioLocal } from './data/repositorioLocal'

/*
  Todas las pantallas se dibujan sin romperse.

  Este archivo existe porque las pantallas nuevas —Ajustes, Tu casa, Lo que hiciste—
  se escribieron sin un test que las montara: podían explotar al dibujarse, por un
  campo que no existe o un import mal puesto, y ninguna prueba lo habría notado. Un
  componente que nunca se montó es código que no se sabe si funciona.

  Se prueba cada pantalla contra la base real, con un repositorio recién creado, y se
  exige un encabezado de nivel 1: es la regla de jerarquía de AGENTS.md y, de paso,
  la señal de que la pantalla llegó a dibujarse de verdad.
*/

let contador = 0

beforeEach(() => {
  contador += 1
  useSesion.setState({
    repositorio: crearRepositorioLocal(`pantallas-${contador}`),
    ambientes: [],
    planActual: null,
    pasoActual: 0,
  })
})

const PANTALLAS = [
  { ruta: '/', nombre: 'elegir ambientes' },
  { ruta: '/armar/cocina', nombre: 'armar un ambiente' },
  { ruta: '/sesion/nueva', nombre: 'elegir el tiempo' },
  { ruta: '/ajustes', nombre: 'ajustes' },
  { ruta: '/casa', nombre: 'el plano de la casa' },
  { ruta: '/logros', nombre: 'lo que hiciste' },
  { ruta: '/plan/no-existe-este-plan', nombre: 'un plan que no está' },
  { ruta: '/una-direccion-que-no-existe', nombre: 'la pantalla de no encontrada' },
]

test.each(PANTALLAS)('$nombre se dibuja sin romperse', async ({ ruta }) => {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        {RUTAS.map((cada) => (
          <Route key={cada.path} path={cada.path} element={cada.element} />
        ))}
      </Routes>
    </MemoryRouter>,
  )

  // `findBy` y no `getBy`: las pantallas cargan de IndexedDB antes de mostrar nada.
  expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
})

test('la pantalla de un plan que no existe ofrece una salida y no queda inerte', async () => {
  render(
    <MemoryRouter initialEntries={['/plan/no-existe-este-plan']}>
      <Routes>
        {RUTAS.map((cada) => (
          <Route key={cada.path} path={cada.path} element={cada.element} />
        ))}
      </Routes>
    </MemoryRouter>,
  )

  expect(await screen.findByText(/no encontramos ese plan/i)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /volvé al principio/i })).toHaveAttribute('href', '/')
  expect(screen.getByRole('link', { name: /armá una sesión nueva/i })).toHaveAttribute('href', '/sesion/nueva')
})

test('las pantallas nuevas son alcanzables desde la primera', async () => {
  // Con `Rutas` entero: los enlaces viven en la barra de pestañas, fuera de las pantallas.
  render(
    <MemoryRouter initialEntries={['/']}>
      <Rutas />
    </MemoryRouter>,
  )

  await screen.findByRole('heading', { level: 1 })
  const pestanas = screen.getByRole('navigation', { name: 'Secciones' })
  // Si un enlace se rompe, la función queda existiendo pero sin puerta de entrada:
  // es el defecto que ya apareció dos veces en esta rama.
  for (const destino of ['/casa', '/logros', '/ajustes']) {
    expect(within(pestanas).getByRole('link', { name: new RegExp(nombreDe(destino), 'i') })).toHaveAttribute(
      'href',
      destino,
    )
  }
  // Y la sección actual se anuncia como tal, no solo por color.
  expect(within(pestanas).getByRole('link', { name: 'Ordenar' })).toHaveAttribute('aria-current', 'page')
})

test.each(['/armar/cocina', '/sesion/nueva', '/plan/cualquiera'])(
  'en el recorrido (%s) no hay barra de pestañas que distraiga',
  async (ruta) => {
    render(
      <MemoryRouter initialEntries={[ruta]}>
        <Rutas />
      </MemoryRouter>,
    )
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('navigation', { name: 'Secciones' })).not.toBeInTheDocument()
  },
)

function nombreDe(destino: string): string {
  if (destino === '/casa') return 'tu casa'
  if (destino === '/logros') return 'lo que hiciste'
  return 'ajustes'
}
