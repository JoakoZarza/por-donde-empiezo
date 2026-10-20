import { BrowserRouter, Route, Routes } from 'react-router'
import type { ReactElement } from 'react'
import PrimeraVez from './ui/pantallas/PrimeraVez'
import Armado from './ui/pantallas/Armado'
import ArranqueSesion from './ui/pantallas/ArranqueSesion'
import Plan from './ui/pantallas/Plan'
import Ajustes from './ui/pantallas/Ajustes'
import Logros from './ui/pantallas/Logros'
import Casa from './ui/pantallas/Casa'
import NoEncontrada from './ui/pantallas/NoEncontrada'
import Privacidad from './ui/pantallas/Privacidad'
import Avisos from './ui/componentes/Avisos'
import BarraDePestanas from './ui/componentes/BarraDePestanas'

/*
  Las rutas se declaran como datos para que los tests puedan montarlas con
  `MemoryRouter` sin arrastrar el historial del navegador. La URL es la fuente de
  verdad de qué pantalla se ve, y el plan en curso se identifica en la dirección.
*/

export interface RutaDeLaApp {
  path: string
  element: ReactElement
}

export const RUTAS: RutaDeLaApp[] = [
  { path: '/', element: <PrimeraVez /> },
  { path: '/armar/:ambienteId', element: <Armado /> },
  { path: '/sesion/nueva', element: <ArranqueSesion /> },
  { path: '/plan/:planId', element: <Plan /> },
  { path: '/ajustes', element: <Ajustes /> },
  { path: '/logros', element: <Logros /> },
  { path: '/casa', element: <Casa /> },
  { path: '/privacidad', element: <Privacidad /> },
  { path: '*', element: <NoEncontrada /> },
]

export function Rutas() {
  return (
    <>
      <Routes>
        {RUTAS.map((ruta) => (
          <Route key={ruta.path} path={ruta.path} element={ruta.element} />
        ))}
      </Routes>
      <BarraDePestanas />
      <Avisos />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Rutas />
    </BrowserRouter>
  )
}
