import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router'
import { beforeEach, expect, test } from 'vitest'
import type { ReactElement } from 'react'
import { RUTAS } from './App'
import { useSesion } from './ui/estado/sesion'
import type { Plan } from './domain/tipos'

/*
  Navegación. La URL es la fuente de verdad del estado de la pantalla: el plan en
  curso se identifica en la dirección, así el botón Atrás del celular y volver a
  abrir la app no rompen nada.

  Los tests no navegan usando los enlaces de las pantallas reales: usan su propio
  botón. Así no se rompen cuando las pantallas cambien de contenido, que es
  justo lo que pasa en las cuatro tareas siguientes.
*/

function BotonDeNavegacion({ hacia }: { hacia: string }) {
  const navegar = useNavigate()
  return (
    <button type="button" onClick={() => navegar(hacia)}>
      ir a {hacia}
    </button>
  )
}

function renderEn(ruta: string, extras: { path: string; element: ReactElement }[] = []) {
  const rutas = [...RUTAS, ...extras]
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        {rutas.map((unaRuta) => (
          <Route key={unaRuta.path} path={unaRuta.path} element={unaRuta.element} />
        ))}
      </Routes>
    </MemoryRouter>,
  )
}

const planDePrueba: Plan = {
  id: 'plan-1',
  creadoEn: '2026-10-10T21:00:00.000Z',
  modo: 'arrancarYa',
  presupuestoSegundos: 1200,
  pasos: [
    { tareaId: 'cocina-guardar-platos', estado: 'pendiente', hechoEn: null },
    { tareaId: 'cocina-barrer', estado: 'pendiente', hechoEn: null },
  ],
  cerradoEn: null,
  minutosFaltantes: 0,
  advertencias: [],
}

beforeEach(() => {
  useSesion.setState({ ambientes: [], planActual: null, pasoActual: 0 })
  document.title = ''
})

test('la ruta raíz muestra la pantalla de elección de ambientes', () => {
  renderEn('/')
  expect(screen.getByRole('heading', { name: /qué querés ordenar/i })).toBeInTheDocument()
})

test('la ruta de armado toma el ambiente de la URL', () => {
  renderEn('/armar/cocina')
  expect(screen.getByText(/cocina/i)).toBeInTheDocument()
})

test('la ruta de sesión nueva muestra la elección de tiempo', () => {
  renderEn('/sesion/nueva')
  expect(screen.getByRole('heading', { name: /cuánto tiempo/i })).toBeInTheDocument()
})

test('la ruta del plan toma el identificador del plan de la URL', () => {
  renderEn('/plan/plan-abc')
  expect(screen.getByText('plan-abc')).toBeInTheDocument()
})

test('una ruta desconocida no deja a la persona sin salida', () => {
  renderEn('/no-existe-esta-pantalla')
  expect(screen.getByRole('heading', { name: /no encontramos/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /volver al principio/i })).toBeInTheDocument()
})

test('cada ruta cambia el título del documento', () => {
  renderEn('/')
  expect(document.title).toMatch(/qué querés ordenar/i)

  renderEn('/sesion/nueva')
  expect(document.title).toMatch(/cuánto tiempo/i)
})

test('navegar a otra pantalla no pierde la sesión en curso', async () => {
  // La sesión vive fuera del árbol de rutas: es lo que hace que ir y volver no
  // borre el plan.
  useSesion.setState({ planActual: planDePrueba, pasoActual: 2 })
  const usuario = userEvent.setup()

  renderEn('/prueba', [{ path: '/prueba', element: <BotonDeNavegacion hacia="/sesion/nueva" /> }])
  await usuario.click(screen.getByRole('button', { name: /ir a \/sesion\/nueva/i }))

  expect(screen.getByRole('heading', { name: /cuánto tiempo/i })).toBeInTheDocument()
  expect(useSesion.getState().pasoActual).toBe(2)
  expect(useSesion.getState().planActual?.id).toBe('plan-1')
})
