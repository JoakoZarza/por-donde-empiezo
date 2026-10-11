/*
  IndexedDB no existe en jsdom, y el store construye su repositorio al importarse
  el módulo: cualquier test que toque el store —aunque no use la base— necesita el
  reemplazo. Sin esto, Vitest informa un «Unhandled Rejection: IndexedDB API
  missing» DESPUÉS de que el test termina, sale con código 1 y todos los tests
  parecen haber pasado.
*/
import 'fake-indexeddb/auto'
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
