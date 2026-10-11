import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

/*
  La limpieza automática de Testing Library se registra sola solo si existe un
  `afterEach` global. Con `globals: false` en la configuración de Vitest no
  existe, así que cada test dejaba su árbol montado en el documento y el
  siguiente encontraba dos veces el mismo encabezado.

  Se registra a mano, explícitamente, en vez de activar los globales: así el
  setup sigue siendo legible y no depende de una variable de configuración.
*/
afterEach(() => {
  cleanup()
})
