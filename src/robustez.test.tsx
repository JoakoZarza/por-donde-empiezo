import 'fake-indexeddb/auto'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, expect, test } from 'vitest'
import { RUTAS } from './App'
import { useSesion } from './ui/estado/sesion'
import { crearRepositorioLocal } from './data/repositorioLocal'
import { ambientePorId, tareasDeAmbiente } from './domain/catalogo'
import { generarPlan } from './domain/motor/generarPlan'
import type { Repositorio } from './data/repositorio'

/*
  Lo que pasa cuando algo sale mal, o cuando la persona toca de más.

  Cada test de acá corresponde a un ítem rojo de docs/checklist-producto.md: una
  carga que fallaba quedaba en «Cargando…» para siempre, un doble toque en «Listo»
  marcaba dos pasos, Enter no agregaba la tarea propia y los avisos de Ajustes
  aparecían al pie, lejos de lo que los causó.
*/

let repo: Repositorio
let contador = 0

beforeEach(() => {
  contador += 1
  repo = crearRepositorioLocal(`robustez-${contador}`)
  useSesion.setState({ repositorio: repo, ambientes: [], planActual: null, pasoActual: 0 })
})

function montar(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        {RUTAS.map((cada) => (
          <Route key={cada.path} path={cada.path} element={cada.element} />
        ))}
      </Routes>
    </MemoryRouter>,
  )
}

const falla = () => Promise.reject(new Error('IndexedDB no disponible'))

test.each([
  { ruta: '/casa', metodo: 'listarAmbientes' },
  { ruta: '/logros', metodo: 'listarHistorial' },
  { ruta: '/ajustes', metodo: 'preferencias' },
  { ruta: '/armar/cocina', metodo: 'listarTareas' },
  { ruta: '/sesion/nueva', metodo: 'listarAmbientes' },
  { ruta: '/plan/cualquiera', metodo: 'obtenerPlan' },
] as const)('si la carga de $ruta falla, lo dice y ofrece salida', async ({ ruta, metodo }) => {
  useSesion.setState({ repositorio: { ...repo, [metodo]: falla } })
  montar(ruta)

  expect(await screen.findByRole('alert')).toHaveTextContent(/no pudimos leer tus datos/i)
  expect(screen.getByRole('link', { name: /volver al principio/i })).toHaveAttribute('href', '/')
  expect(screen.getByRole('button', { name: /probá de nuevo/i })).toBeInTheDocument()
})

test('«Probá de nuevo» vuelve a cargar y, si ahora anda, muestra la pantalla', async () => {
  const usuario = userEvent.setup()
  let intentos = 0
  useSesion.setState({
    repositorio: {
      ...repo,
      listarHistorial: () => (intentos++ === 0 ? falla() : repo.listarHistorial()),
    },
  })
  montar('/logros')

  await usuario.click(await screen.findByRole('button', { name: /probá de nuevo/i }))

  expect(await screen.findByText(/todavía no hay nada anotado/i)).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('un doble toque en «Listo» marca un solo paso', async () => {
  const cocina = ambientePorId('cocina')!
  await repo.guardarAmbiente(cocina)
  for (const tarea of tareasDeAmbiente('cocina')) await repo.guardarTarea(tarea)
  const { plan } = generarPlan(
    {
      ambientes: [cocina],
      tareas: tareasDeAmbiente('cocina'),
      hechasEnCiclo: [],
      presupuestoMin: 30,
      modo: 'arrancarYa',
      herramientasDisponibles: ['escoba', 'trapo', 'balde', 'detergente'],
    },
    '2026-10-10T21:00:00.000Z',
    `plan-doble-${contador}`,
  )
  await repo.guardarPlan(plan)
  montar(`/plan/${plan.id}`)
  await screen.findByRole('article')

  // Dos clics en el mismo instante, sin esperar entre uno y otro: lo que hace un
  // pulgar apurado.
  const listo = screen.getByRole('button', { name: 'Listo' })
  fireEvent.click(listo)
  fireEvent.click(listo)

  await waitFor(() => expect(useSesion.getState().pasoActual).toBe(1))
  // Se le da tiempo al segundo toque para que, si pasara, llegue a guardarse.
  await new Promise((resolver) => setTimeout(resolver, 50))
  expect(useSesion.getState().pasoActual).toBe(1)
  /*
    Sin la guarda, los dos toques leen el mismo paso actual y lo cierran dos veces:
    la tarea queda anotada doble en el historial, y los totales de «Lo que hiciste»
    —que no bajan nunca— suben por algo que se hizo una sola vez.
  */
  expect(await repo.listarHistorial()).toHaveLength(1)
})

test('Enter en «Agregar algo mío» agrega la tarea', async () => {
  const usuario = userEvent.setup()
  montar('/armar/cocina')

  await usuario.type(await screen.findByLabelText(/agregar algo mío/i), 'Regar las plantas{Enter}')

  expect(await screen.findByRole('checkbox', { name: /regar las plantas/i })).toBeChecked()
  expect(screen.getByLabelText(/agregar algo mío/i)).toHaveValue('')
})

test('si guardar la tarea propia falla, lo escrito queda y el aviso va pegado al campo', async () => {
  const usuario = userEvent.setup()
  montar('/armar/cocina')
  const campo = await screen.findByLabelText(/agregar algo mío/i)

  // Recién ahora falla: la siembra del catálogo ya se guardó bien.
  useSesion.setState({ repositorio: { ...repo, guardarTarea: falla } })
  await usuario.type(campo, 'Regar las plantas{Enter}')

  expect(await screen.findByText(/no pudimos guardar la tarea/i)).toBeInTheDocument()
  expect(campo).toHaveValue('Regar las plantas')
  expect(campo).toHaveAttribute('aria-invalid', 'true')
  expect(campo).toHaveAccessibleDescription(/no pudimos guardar la tarea/i)
  expect(campo).toHaveFocus()
})

test('el campo vacío se explica junto al campo y recibe el foco', async () => {
  const usuario = userEvent.setup()
  montar('/armar/cocina')
  const campo = await screen.findByLabelText(/agregar algo mío/i)

  await usuario.click(screen.getByRole('button', { name: /^agregar$/i }))

  expect(campo).toHaveAccessibleDescription(/escribí qué hay que hacer/i)
  expect(campo).toHaveFocus()
})

test('en Ajustes, el aviso de la clave aparece junto al campo de la clave', async () => {
  const usuario = userEvent.setup()
  await repo.guardarPreferencias({ ...(await repo.preferencias()), avisoDePrivacidadAceptado: true })
  montar('/ajustes')

  await usuario.click(await screen.findByRole('button', { name: /guardar la clave/i }))

  const campo = screen.getByLabelText(/tu clave de google/i)
  expect(campo).toHaveAccessibleDescription(/pegá una clave primero/i)
  expect(campo).toHaveAttribute('aria-invalid', 'true')
  expect(campo).toHaveFocus()
})

test('en Ajustes, si guardar falla, el aviso aparece en la sección que se tocó', async () => {
  const usuario = userEvent.setup()
  montar('/ajustes')
  // La carrera es la de fábrica, así que se toca la otra.
  const cuentaAtras = await screen.findByRole('radio', { name: /cuenta atrás/i })

  useSesion.setState({ repositorio: { ...repo, guardarPreferencias: falla } })
  await usuario.click(cuentaAtras)

  const seccion = cuentaAtras.closest('fieldset')!
  expect(await screen.findByText(/no pudimos guardar este cambio/i)).toBeInTheDocument()
  expect(seccion).toHaveTextContent(/no pudimos guardar este cambio/i)
  // Y se revirtió: la elección vuelve a la que estaba guardada.
  expect(screen.getByRole('radio', { name: /cuenta atrás/i })).not.toBeChecked()
})
