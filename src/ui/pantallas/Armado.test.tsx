import 'fake-indexeddb/auto'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, expect, test } from 'vitest'
import Armado from './Armado'
import { useSesion } from '../estado/sesion'
import { crearRepositorioLocal } from '../../data/repositorioLocal'
import { ambientePorId, tareasDeAmbiente } from '../../domain/catalogo'
import type { Repositorio } from '../../data/repositorio'

/*
  El armado del ambiente: qué se hace y qué no.

  Lo que está guardado en el teléfono ES la lista de lo incluido. Destildar una
  tarea la borra del repositorio; volver a tildarla la devuelve. No hay un campo
  «incluida» aparte que pueda quedar desincronizado.
*/

let repo: Repositorio
let contador = 0

beforeEach(async () => {
  contador += 1
  repo = crearRepositorioLocal(`armado-${contador}`)
  const cocina = ambientePorId('cocina')!
  await repo.guardarAmbiente(cocina)
  for (const tarea of tareasDeAmbiente('cocina')) await repo.guardarTarea(tarea)
  useSesion.setState({ repositorio: repo, ambientes: [cocina], planActual: null, pasoActual: 0 })
})

function montar() {
  return render(
    <MemoryRouter initialEntries={['/armar/cocina']}>
      <Routes>
        <Route path="/armar/:ambienteId" element={<Armado />} />
      </Routes>
    </MemoryRouter>,
  )
}

test('muestra las tareas agrupadas por el nombre del objeto', async () => {
  montar()
  expect(await screen.findByRole('heading', { name: /mesada/i })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /piso/i })).toBeInTheDocument()
})

test('las tareas guardadas vienen tildadas por defecto', async () => {
  montar()
  expect(await screen.findByRole('checkbox', { name: /guardá los platos/i })).toBeChecked()
})

test('destildar una tarea la saca de lo guardado', async () => {
  const usuario = userEvent.setup()
  montar()
  const casilla = await screen.findByRole('checkbox', { name: /guardá los platos/i })

  await usuario.click(casilla)

  expect(casilla).not.toBeChecked()
  await waitFor(async () => {
    const guardadas = await repo.listarTareas('cocina')
    expect(guardadas.map((t) => t.id)).not.toContain('cocina-guardar-platos')
  })
})

test('volver a tildar una tarea destildada la devuelve', async () => {
  const usuario = userEvent.setup()
  montar()
  const casilla = await screen.findByRole('checkbox', { name: /guardá los platos/i })

  await usuario.click(casilla)
  await usuario.click(casilla)

  expect(casilla).toBeChecked()
  await waitFor(async () => {
    const guardadas = await repo.listarTareas('cocina')
    expect(guardadas.map((t) => t.id)).toContain('cocina-guardar-platos')
  })
})

test('agrega una tarea propia y la guarda', async () => {
  const usuario = userEvent.setup()
  montar()
  await screen.findByRole('heading', { name: /mesada/i })

  await usuario.type(screen.getByLabelText(/agregar algo mío/i), 'Regar las plantas')
  await usuario.click(screen.getByRole('button', { name: /^agregar$/i }))

  expect(await screen.findByText(/regar las plantas/i)).toBeInTheDocument()
  await waitFor(async () => {
    const guardadas = await repo.listarTareas('cocina')
    const propia = guardadas.find((t) => t.accion === 'Regar las plantas')
    expect(propia).toBeDefined()
    expect(propia?.esDelCatalogo).toBe(false)
  })
})

test('no guarda una tarea propia con el nombre vacío, y lo explica', async () => {
  // Caso 3 de Review Focus.
  const usuario = userEvent.setup()
  montar()
  await screen.findByRole('heading', { name: /mesada/i })

  await usuario.type(screen.getByLabelText(/agregar algo mío/i), '    ')
  await usuario.click(screen.getByRole('button', { name: /^agregar$/i }))

  expect(await screen.findByRole('status')).toBeInTheDocument()
  const guardadas = await repo.listarTareas('cocina')
  expect(guardadas.every((t) => t.esDelCatalogo)).toBe(true)
})

test('un nombre de 150 caracteres se guarda completo: el recorte es solo visual', async () => {
  /*
    Caso 3 de Review Focus, la mitad de los datos.

    La otra mitad —que un nombre largo no empuje el botón fuera de la pantalla— se
    prueba en `estilos.test.ts`, porque en jsdom no hay layout que medir y este test
    solo podía afirmar que se guardó. Acá se fija lo complementario: el texto se
    guarda ENTERO. El recorte a tres líneas es de la pantalla, y truncar el dato
    sería perder lo que la persona escribió.
  */
  const usuario = userEvent.setup()
  montar()
  await screen.findByRole('heading', { name: /mesada/i })

  const largo =
    'Limpiar el mueble del living que tiene todos los libros y las revistas viejas apiladas y también las cajas de la mudanza'
  expect(largo.length).toBeGreaterThan(100)

  await usuario.type(screen.getByLabelText(/agregar algo mío/i), largo)
  await usuario.click(screen.getByRole('button', { name: /^agregar$/i }))

  await waitFor(async () => {
    const guardada = (await repo.listarTareas('cocina')).find((t) => t.accion === largo)
    expect(guardada).toBeDefined()
    expect(guardada?.accion).toHaveLength(largo.length)
  })

  // Y la pantalla sigue entera: el grupo no se perdió al entrar el nombre largo.
  expect(screen.getByRole('heading', { name: /mesada/i })).toBeInTheDocument()
})
