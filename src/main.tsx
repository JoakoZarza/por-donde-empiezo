import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
/*
  Las tipografías del plan visual, servidas desde el propio sitio y no desde un CDN
  de terceros: es una PWA que tiene que abrir sin conexión, y la especificación
  prohíbe rastreadores ajenos.

  Se importa el eje de peso (`wght.css`) y no el paquete entero: cada archivo trae
  todos los subconjuntos con `unicode-range`, así que el navegador descarga solo el
  latino, que es el que hace falta para español.
*/
import '@fontsource-variable/instrument-sans/wght.css'
import '@fontsource-variable/bricolage-grotesque/wght.css'
import './ui/estilos/tokens.css'
import './ui/estilos/base.css'
import './ui/estilos/pantallas.css'
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
