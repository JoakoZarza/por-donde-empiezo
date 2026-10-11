import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './ui/estilos/tokens.css'
import './ui/estilos/base.css'
import App from './App'

const contenedor = document.getElementById('root')
if (!contenedor) {
  throw new Error('No se encontró el elemento #root en index.html')
}

createRoot(contenedor).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
