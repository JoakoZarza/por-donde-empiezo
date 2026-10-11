import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, expect, test } from 'vitest'
import { RUTAS } from './App'
import { useSesion } from './ui/estado/sesion'
import { crearRepositorioLocal } from './data/repositorioLocal'
import { ambientePorId, tareasDeAmbiente } from './domain/catalogo'
import { elegirPasoDeArranque } from './domain/motor/arranque'
import { generarPlan } from './domain/motor/generarPlan'
import type { Repositorio } from './data/repositorio'
import type { Tarea } from './domain/tipos'

/*
  Regresiones de la revisión final de la rama. Cada test acá corresponde a un
  hallazgo concreto del informe, y todos fallaron antes del arreglo.

  El más grave: la app podía quedar en un bucle sin salida. En una PWA instalada no
  hay botón Atrás, así que un callejón sin salida obliga a matar la app.
*/

let repo: Repositorio
let contador = 0

beforeEach(async () => {
  contador += 1
  repo = crearRepositorioLocal(`regresion-${contador}`)
  const cocina = ambientePorId('cocina')!
  await repo.guardarAmbiente(cocina)
  useSesion.setState({ repositorio: repo, ambientes: [cocina], planActual: null, pasoActual: 0 })
})

function montar(entrada = '/sesion/nueva') {
  return render(
    <MemoryRouter initialEntries={[entrada]}>
      <Routes>
        {RUTAS.map((ruta) => (
          <Route key={ruta.path} path={ruta.path} element={ruta.element} />
        ))}
      </Routes>
    </MemoryRouter>,
  )
}

async function sembrarTareas(): Promise<Tarea[]> {
  const tareas = tareasDeAmbiente('cocina')
  for (const tarea of tareas) await repo.guardarTarea(tarea)
  return tareas
}

test('C1: con todas las tareas ya hechas, la pantalla ofrece una salida de verdad', async () => {
  const tareas = await sembrarTareas()
  for (const tarea of tareas) await repo.marcarHecha(tarea.id, '2026-10-10T21:00:00.000Z')

  montar()
  const salida = await screen.findByRole('link', { name: /volver al principio/i })
  expect(salida).toHaveAttribute('href', '/')
  // Y no puede culpar a la persona de algo que no hizo.
  expect(screen.queryByText(/revisá las tareas incluidas/i)).not.toBeInTheDocument()
})

test('C1: el plan vacío por tener todo hecho tampoco es un callejón sin salida', async () => {
  const tareas = await sembrarTareas()
  for (const tarea of tareas) await repo.marcarHecha(tarea.id, '2026-10-10T21:00:00.000Z')

  const ambientes = await repo.listarAmbientes()
  const { plan } = generarPlan(
    {
      ambientes,
      tareas,
      hechasEnCiclo: tareas.map((t) => t.id),
      presupuestoMin: 20,
      modo: 'arrancarYa',
      herramientasDisponibles: ['escoba', 'trapo', 'balde', 'detergente'],
    },
    '2026-10-10T21:00:00.000Z',
    'plan-vacio',
  )
  await repo.guardarPlan(plan)

  montar('/plan/plan-vacio')
  expect(await screen.findByRole('link', { name: /volver al principio/i })).toBeInTheDocument()
})

test('C2: sin ninguna tarea tildada, la pantalla ofrece volver y no queda muerta', async () => {
  // El ambiente está guardado pero sin tareas: es el caso 2 de Review Focus.
  montar()
  expect(await screen.findByText(/no hay ninguna tarea/i)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /elegir ambientes/i })).toHaveAttribute('href', '/')
})

test('I1: al recargar, el plan arranca en el primer paso pendiente', async () => {
  const tareas = await sembrarTareas()
  const ambientes = await repo.listarAmbientes()
  const { plan } = generarPlan(
    {
      ambientes,
      tareas,
      hechasEnCiclo: [],
      presupuestoMin: 60,
      modo: 'arrancarYa',
      herramientasDisponibles: ['escoba', 'trapo', 'balde', 'detergente'],
    },
    '2026-10-10T21:00:00.000Z',
    'plan-recarga',
  )
  // El primer paso ya está hecho; el plan se guarda con eso.
  const conElPrimeroHecho = {
    ...plan,
    pasos: plan.pasos.map((paso, indice) =>
      indice === 0 ? { ...paso, estado: 'hecho' as const, hechoEn: '2026-10-10T21:05:00.000Z' } : paso,
    ),
  }
  await repo.guardarPlan(conElPrimeroHecho)

  // Recarga limpia: el store no sabe nada.
  useSesion.setState({ planActual: null, pasoActual: 0 })
  montar('/plan/plan-recarga')

  const segundo = tareas.find((t) => t.id === plan.pasos[1]!.tareaId)!
  expect(await screen.findByRole('heading', { name: segundo.accion })).toBeInTheDocument()
})

test('I4: volver a elegir un ambiente no revive las tareas que se habían destildado', async () => {
  const tareas = await sembrarTareas()
  const quitada = tareas[0]!

  await useSesion.getState().elegirAmbientes(['cocina'])
  await repo.eliminarTarea(quitada.id)
  await useSesion.getState().elegirAmbientes(['cocina'])

  const guardadas = await repo.listarTareas('cocina')
  expect(guardadas.map((t) => t.id)).not.toContain(quitada.id)
})

test('M6: si el respaldo del arranque elige una tarea con dependencias, lo advierte', () => {
  const conDependencias: Tarea = {
    id: 'bloqueada',
    ambienteId: 'cocina',
    subAmbienteId: null,
    objetoId: null,
    verbo: 'limpiar',
    accion: 'Limpiá',
    descripcion: 'algo',
    duracionMin: 9,
    esfuerzo: 1,
    impactoVisual: 1,
    requiere: ['previa'],
    herramientas: [],
    esDelCatalogo: true,
    notas: null,
  }
  const pendientes = new Map([['bloqueada', new Set(['previa'])]])
  const resultado = elegirPasoDeArranque(
    [conDependencias],
    pendientes,
    { ambienteAnterior: null, herramientasEnMano: [] },
    'arrancarYa',
  )
  expect(resultado?.advertencia).not.toBeNull()
})
