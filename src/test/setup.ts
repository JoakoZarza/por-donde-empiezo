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
import { configure } from '@testing-library/react'

/*
  El timeout por defecto de las consultas asíncronas es de un segundo, y la suite
  completa —con IndexedDB real y varios workers— lo pasa de largo en las máquinas
  lentas: los tests fallaban por tiempo, no por comportamiento. Se sube el techo
  en vez de bajar la cantidad de aserciones: un test que falla por reloj no dice
  nada sobre el código.
*/
configure({ asyncUtilTimeout: 5000 })

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
