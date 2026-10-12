import { existsSync, readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

// Se lee con tolerancia a que el archivo no exista todavía: así, cuando falta la
// hoja de estilos, cada test falla por su propia aserción y no por un ENOENT que
// taparía si la aserción está bien escrita.
//
// Y se quitan los comentarios antes de comparar: si no, una regla mencionada en
// la prosa de un comentario haría pasar —o fallar— un test sin que la regla
// exista de verdad en el código. Pasó: el comentario «transition: all está
// prohibido» hacía fallar el test que prohíbe `transition: all`.
function leer(ruta: string): string {
  if (!existsSync(ruta)) return ''
  return readFileSync(ruta, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
}

const todaLaHoja = () =>
  leer('src/ui/estilos/tokens.css') + leer('src/ui/estilos/base.css') + leer('src/ui/estilos/pantallas.css')
const html = () => leer('index.html')

test('define al menos cuatro colores con nombre', () => {
  const colores = leer('src/ui/estilos/tokens.css').match(/--color-[a-z0-9-]+:\s*#[0-9a-fA-F]{3,8}/g) ?? []
  expect(colores.length).toBeGreaterThanOrEqual(4)
})

test('define los seis colores exactos del plan visual aprobado', () => {
  const tokens = leer('src/ui/estilos/tokens.css')
  const esperados: Record<string, string> = {
    '--color-noche': '#171633',
    '--color-pared': '#232246',
    '--color-hueso': '#F1EEF9',
    '--color-humo': '#A8A4C6',
    '--color-velador': '#F2B455',
    '--color-menta': '#7FC8AE',
  }
  for (const [token, valor] of Object.entries(esperados)) {
    expect(tokens, `falta o cambió ${token}`).toMatch(new RegExp(`${token}:\\s*${valor}\\s*;`, 'i'))
  }
})

test('nunca usa transition: all', () => {
  const hoja = todaLaHoja()
  // Precondición: sin esto, el test pasa con la hoja vacía y no prueba nada.
  expect(hoja).toMatch(/--color-velador/)
  expect(hoja).not.toMatch(/transition:\s*all/)
})

test('respeta las safe areas', () => {
  expect(todaLaHoja()).toMatch(/env\(safe-area-inset-/)
})

test('define color-scheme y el anillo de foco', () => {
  expect(todaLaHoja()).toMatch(/color-scheme:\s*dark/)
  expect(todaLaHoja()).toMatch(/:focus-visible/)
})

test('evita el zoom por doble toque y el resaltado azul por defecto', () => {
  const hoja = todaLaHoja()
  expect(hoja).toMatch(/--color-velador/)
  expect(hoja).toMatch(/touch-action:\s*manipulation/)
  expect(hoja).toMatch(/-webkit-tap-highlight-color/)
})

test('no deshabilita el zoom del navegador', () => {
  expect(html()).not.toMatch(/maximum-scale|user-scalable\s*=\s*no/)
})

test('las entradas de texto no disparan el zoom automático de iOS', () => {
  expect(todaLaHoja()).toMatch(/font-size:\s*1(6|7|8|9)px/)
})

test('las tipografías aprobadas se cargan de verdad, no solo se declaran', () => {
  // Este test existe por un defecto real: durante varias tareas los tokens
  // declaraban Instrument Sans y Bricolage Grotesque, no había ningún archivo, y
  // todo caía a la tipografía del sistema sin que nada lo avisara.
  const main = leer('src/main.tsx')
  expect(main).toMatch(/@fontsource-variable\/instrument-sans/)
  expect(main).toMatch(/@fontsource-variable\/bricolage-grotesque/)

  // Y el nombre declarado tiene que ser el que el paquete realmente expone.
  expect(todaLaHoja()).toMatch(/Instrument Sans Variable/)
  expect(todaLaHoja()).toMatch(/Bricolage Grotesque Variable/)
})

test('un enlace con aspecto de botón conserva el área táctil mínima', () => {
  // Este test existe por un defecto real que apareció dos veces: un `<a>` es
  // `display: inline`, `min-height` no le aplica, y el área táctil de un enlace
  // disfrazado de botón quedaba por debajo de los 44 px. En la computadora se toca
  // con el mouse y no se nota; en el teléfono, con el pulgar, sí.
  const hoja = todaLaHoja()
  const conAreaTactil = /\.boton-principal,\s*\.boton-secundario\s*\{[^}]*display:\s*flex/
  expect(hoja).toMatch(conAreaTactil)
  expect(hoja).toMatch(/min-height:\s*var\(--toque-minimo\)/)
})
