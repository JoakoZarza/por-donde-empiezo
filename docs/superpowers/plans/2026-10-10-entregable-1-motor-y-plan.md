# Entregable 1 — El motor y el plan: Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. (El skill `subagent-driven-development` no está instalado en esta máquina; si se instala, es la alternativa más rigurosa.)

**Goal:** Construir la primera rebanada usable de *Por Dónde Empiezo*: una PWA mobile-first donde alguien elige sus ambientes, tilda las tareas que quiere hacer, dice cuánto tiempo tiene, y recibe un plan paso a paso ordenado por dependencias reales, empezando por un paso de dos minutos.

**Architecture:** Cuatro módulos con una sola responsabilidad cada uno. `domain/` es puro y determinístico (tipos, catálogo, motor de orden) y no importa React ni red. `data/` esconde la persistencia detrás de una interfaz. `ui/` es React y no sabe de dónde vienen los datos. `sync/` no existe todavía: llega en el entregable 5.

**Tech Stack:** TypeScript, React, Vite, Tailwind CSS, React Router, Zustand, Dexie (IndexedDB), Vitest + Testing Library, `vite-plugin-pwa`.

**Spec:** `docs/superpowers/specs/2026-10-10-por-donde-empiezo-design.md`
**Reglas de interfaz obligatorias:** `AGENTS.md` (raíz del repositorio)

## Global Constraints

Copiadas de la especificación y de `AGENTS.md`. Valen para **todas** las tareas.

**Entorno**
- `pnpm` **no está en el PATH.** Se invoca siempre como
  `"C:\Users\joako\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe" "C:\Users\joako\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\pnpm\bin\pnpm.mjs" <args>`
- Instalar la **versión estable actual** de cada dependencia y commitear la versión resuelta en `package.json`. No inventar números de versión.
- Dependencias permitidas: solo las del stack de arriba. Ninguna biblioteca de UI, de estado ni de animación adicional sin aprobación explícita.
- Sin analítica de terceros ni rastreadores.

**Producto (no negociables)**
- Ningún indicador baja por no usar la app. No hay rachas, vidas, rojo ni notificaciones que reclamen.
- Ninguna función exige cuenta. No hay registro en el entregable 1.
- El estado de un ambiente cambia **solo** cuando la persona hace algo. Nunca por el paso del tiempo.
- Nunca se borra nada en silencio: toda acción destructiva se confirma o tiene deshacer.
- La primera tarea del plan dura **≤ 2 minutos** y no tiene dependencias sin resolver.
- Nunca se trapea antes de barrer.

**Interfaz (`AGENTS.md`)**
- Español rioplatense con voseo. Frase de caso oración en todo, incluidos botones. Comillas «» o “ ”, carácter `…`, espacios duros en unidades (`10&nbsp;min`).
- Área táctil mínima 44&nbsp;px, incluidos los controles secundarios.
- Entradas de texto con `font-size` ≥ 16&nbsp;px. El zoom del navegador **nunca** se deshabilita.
- Safe areas con `env(safe-area-inset-*)` en todo contenedor que toque el borde.
- `aria-live="polite"` cada vez que cambia el paso actual.
- Fechas y números con `Intl`, nunca formateados a mano.
- Información nunca solo por color.
- `transition: all` prohibido: listar siempre las propiedades.
- Estados vacío, escaso, lleno y de error en cada pantalla.
- Contraste WCAG 2.2 AA como piso.
- El estado vive en la URL; el botón Atrás nunca rompe una sesión en curso.

**El motor es puro**
- Prohibido `Date.now()`, `new Date()` y `Math.random()` dentro de `src/domain/`. Toda marca de tiempo entra por parámetro. Esto es lo que hace verificable la garantía de determinismo (G5).

## Review Focus

Cinco formas de romper el programa que la especificación implica pero que ningún requisito enumera. Cada una tiene su test en la tarea que posee el código, indicado entre paréntesis.

1. **Presupuesto insuficiente.** La persona elige 10&nbsp;minutos y la única tarea tildada dura 20. Debe decirlo con claridad y ofrecer el tiempo real que falta; **nunca** una lista vacía ni una pantalla en blanco. (Tarea 11)
2. **Nada seleccionado.** Cero ambientes elegidos, o un ambiente con todas las tareas destildadas. Debe ser un estado vacío que invita a un paso siguiente, no un error ni una pantalla muerta. (Tareas 12 y 15)
3. **Nombre de tarea escrito por la persona.** Vacío, con solo espacios, o de 150&nbsp;caracteres. No se guarda vacío, y el layout no se rompe con el largo. (Tareas 13 y 16)
4. **Una herramienta faltante borra el único paso de dos minutos.** Si la persona dice que no tiene trapo y eso elimina la única tarea de ≤ 2&nbsp;min del ambiente de arranque, el motor usa el respaldo (la tarea más corta) y **deja la advertencia registrada**. No puede violar la garantía en silencio. (Tarea 9)
5. **Empates.** Dos ambientes con la misma cantidad de tareas pendientes, o dos con el mismo `ordenRecorrido`. El plan tiene que salir igual todas las veces: el desempate final es siempre por `ambienteId` ascendente. (Tareas 9 y 10)

---

## Estructura de archivos

```
AGENTS.md                     Ya existe. Reglas de interfaz obligatorias.
docs/superpowers/             Especificación, plan visual y este plan.
index.html
package.json
tsconfig.json
vite.config.ts
vitest.config.ts
eslint.config.js
src/
  main.tsx                    Punto de entrada.
  App.tsx                     Ruteo y layout raíz.
  domain/                     PURO. Sin React, sin red, sin fechas del sistema.
    tipos.ts                  Todos los tipos del dominio.
    catalogo/
      validar.ts              Valida las cinco obligaciones de integridad del catálogo.
      cocina.ts               Contenido del ambiente cocina.
      ambientes.ts            Contenido de los otros siete ambientes.
      index.ts                Catálogo completo ensamblado.
    motor/
      puntaje.ts              Función de puntaje y tabla de pesos por modo.
      grafo.ts                Grafo de dependencias, detección y ruptura de ciclos.
      arranque.ts             Elección del ambiente y del paso de arranque (≤ 2 min).
      ordenar.ts              Orden topológico con comparador por modo.
      presupuesto.ts          Recorte al presupuesto y minutos faltantes.
      generarPlan.ts          Los siete pasos del algoritmo, ensamblados.
  data/
    repositorio.ts            Interfaz. Única puerta a la persistencia.
    repositorioLocal.ts       Implementación con Dexie sobre IndexedDB.
  ui/
    estilos/
      tokens.css              Paleta, tipografías, espaciados (del plan visual).
      base.css                Foco, safe areas, gestos, tipografía base.
    estado/
      sesion.ts               Store de Zustand.
    pantallas/
      PrimeraVez.tsx          Elegir ambientes.
      Armado.tsx              Tildar tareas de un ambiente, agregar propias.
      ArranqueSesion.tsx      Cuánto tiempo y en qué modo.
      Plan.tsx                El paso actual. La pantalla central.
    componentes/
      PasoActual.tsx          La tarjeta grande con el paso en curso.
      EstadoVacio.tsx         Estado vacío reutilizable.
tests/                        Los archivos de test viven al lado del código, como *.test.ts.
```

---

## Tareas

### Task 1: Plan visual aprobado

Bloquea la Tarea 3 y todas las pantallas. La sección 13.3 de la especificación prohíbe escribir un componente visual antes de que esto exista.

**Files:**
- Create: `docs/superpowers/specs/2026-10-10-por-donde-empiezo-plan-visual.md`

**Interfaces:**
- Consumes: nada.
- Produces: los nombres y valores de los tokens de color y tipografía que la Tarea 3 traduce a `tokens.css`.

- [ ] **Step 1: Proponer tres direcciones visuales distintas**

Tres propuestas, cada una con paleta de 4 a 6 colores con nombre y valor, una o dos tipografías con su rol, y una frase que describa el concepto. Las tres tienen que ser claramente distintas entre sí.

La dirección debe salir del tema: una casa, una persona cansada, una tarea por vez. **No** se admiten los cinco clichés de diseño generado: fondo crema con serif y acento terracota; fondo casi negro con un verde ácido; layout de diario con filetes finos y esquinas rectas; el kit de tarjetas SaaS idénticas con la misma sombra gris; ni la etiqueta en mayúsculas espaciadas arriba de cada título.

- [ ] **Step 2: Presentar las tres al humano y esperar la elección**

Presentar en el chat. No avanzar sin una elección explícita.

- [ ] **Step 3: Escribir el documento del plan visual**

Debe contener: la paleta con nombres y valores, las tipografías y el rol de cada una, el concepto de layout con una descripción por pantalla, los principios que hacen que esto se vea como esta app y no como una plantilla, y el contraste calculado de cada par texto/fondo contra WCAG 2.2 AA.

- [ ] **Step 4: Verificar el contraste antes de aprobar**

Cada par texto/fondo del documento tiene que declarar su relación de contraste y cumplir AA (4.5:1 para texto normal, 3:1 para texto grande). Si alguno no cumple, corregir el color en el documento.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-10-10-por-donde-empiezo-plan-visual.md
git commit -m "docs: plan visual aprobado para Por Donde Empiezo"
```

---

### Task 2: Andamiaje del proyecto

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `eslint.config.js`, `index.html`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: los comandos `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm lint`; y la configuración de Vitest con entorno `jsdom` y `fake-indexeddb` disponible.

- [ ] **Step 1: Inicializar el proyecto e instalar dependencias**

Instalar React, React DOM, Vite, TypeScript, Tailwind CSS, React Router, Zustand, Dexie, Vitest, Testing Library (react + user-event + jest-dom), jsdom, `fake-indexeddb`, `vite-plugin-pwa`, ESLint y `eslint-plugin-jsx-a11y`.

Agregar los scripts `dev`, `build`, `preview`, `test`, `lint` a `package.json`.

- [ ] **Step 2: Escribir la configuración de ESLint con accesibilidad**

`eslint.config.js` debe incluir `eslint-plugin-jsx-a11y` con sus reglas recomendadas, y una regla propia que **prohíba** `transition: all` (la regla de `AGENTS.md`).

- [ ] **Step 3: Escribir el test de humo**

```tsx
// src/App.test.tsx
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import App from './App'

test('la app arranca y muestra su nombre', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /por dónde empiezo/i })).toBeInTheDocument()
})
```

- [ ] **Step 4: Correr el test y verificar que falla**

Run: `node pnpm.mjs test`
Expected: FAIL — no existe `src/App.tsx`.

- [ ] **Step 5: Escribir `src/App.tsx` y `src/main.tsx` mínimos**

`App` devuelve un `<h1>` con «Por dónde empiezo». Nada más: el ruteo llega en la Tarea 14.

- [ ] **Step 6: Correr el test y verificar que pasa**

Run: `node pnpm.mjs test`
Expected: PASS, 1 test.

- [ ] **Step 7: Verificar que el lint pasa**

Run: `node pnpm.mjs lint`
Expected: sin errores.

- [ ] **Step 8: Verificar que compila**

Run: `node pnpm.mjs build`
Expected: build exitoso.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: andamiaje del proyecto con Vite, React, TypeScript y Vitest"
```

---

### Task 3: Tokens y base del sistema de diseño en código

**Files:**
- Create: `src/ui/estilos/tokens.css`, `src/ui/estilos/base.css`, `src/ui/estilos/estilos.test.ts`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: los nombres y valores del plan visual (Tarea 1).
- Produces: las variables CSS que usan todas las pantallas.

- [ ] **Step 1: Escribir el test de contrato de los estilos**

Este test es un lint verificable: traduce reglas de `AGENTS.md` en assertions sobre el CSS real.

```ts
// src/ui/estilos/estilos.test.ts
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

const tokens = readFileSync('src/ui/estilos/tokens.css', 'utf8')
const base = readFileSync('src/ui/estilos/base.css', 'utf8')
const todaLaHoja = tokens + base

test('define al menos cuatro colores con nombre', () => {
  const colores = tokens.match(/--color-[a-z0-9-]+:\s*#[0-9a-fA-F]{3,8}/g) ?? []
  expect(colores.length).toBeGreaterThanOrEqual(4)
})

test('nunca usa transition: all', () => {
  expect(todaLaHoja).not.toMatch(/transition:\s*all/)
})

test('respeta las safe areas', () => {
  expect(todaLaHoja).toMatch(/env\(safe-area-inset-/)
})

test('define color-scheme y el anillo de foco', () => {
  expect(todaLaHoja).toMatch(/color-scheme:\s*dark/)
  expect(todaLaHoja).toMatch(/:focus-visible/)
})

test('evita el zoom por doble toque y el resaltado azul por defecto', () => {
  expect(todaLaHoja).toMatch(/touch-action:\s*manipulation/)
  expect(todaLaHoja).toMatch(/-webkit-tap-highlight-color/)
})

test('no deshabilita el zoom del navegador', () => {
  const html = readFileSync('index.html', 'utf8')
  expect(html).not.toMatch(/maximum-scale|user-scalable\s*=\s*no/)
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `node pnpm.mjs test src/ui/estilos`
Expected: FAIL — los archivos no existen.

- [ ] **Step 3: Escribir `tokens.css` y `base.css`**

`tokens.css`: la paleta del plan visual como `--color-*`, las familias tipográficas, la escala de tamaños y los espaciados.

`base.css`: `color-scheme: dark`, `touch-action: manipulation`, `-webkit-tap-highlight-color`, anillo de foco con `:focus-visible` (nunca `outline: none` sin reemplazo), `text-wrap: balance` en títulos, variables de safe area, y `font-size` base ≥ 16&nbsp;px en `input`, `textarea` y `select`.

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `node pnpm.mjs test src/ui/estilos`
Expected: PASS, 6 tests.

- [ ] **Step 5: Importar las hojas en `src/main.tsx`**

- [ ] **Step 6: Commit**

```bash
git add src/ui/estilos src/main.tsx index.html
git commit -m "feat: tokens y base del sistema de diseno"
```

---

### Task 4: Tipos del dominio y validador del catálogo

**Files:**
- Create: `src/domain/tipos.ts`, `src/domain/catalogo/validar.ts`, `src/domain/catalogo/validar.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: todos los tipos del dominio, y `validarCatalogo(ambientes: Ambiente[], tareas: Tarea[]): string[]` que devuelve la lista de problemas encontrados (vacía si el catálogo es válido).

- [ ] **Step 1: Escribir `src/domain/tipos.ts`**

```ts
export type Modo = 'arrancarYa' | 'ambientePorAmbiente' | 'puestaAPunto'
export type Verbo = 'ordenar' | 'limpiar' | 'guardar' | 'tirar' | 'lavar'
export type EstadoPaso = 'pendiente' | 'hecho' | 'salteado'
export type EstadoAmbiente = 'pendiente' | 'aMedioCamino' | 'alDia'
export type TipoAmbiente =
  | 'cocina' | 'bano' | 'dormitorio' | 'living'
  | 'lavadero' | 'balcon' | 'escritorio' | 'garage'

export interface Ambiente {
  id: string
  hogarId: string
  tipo: TipoAmbiente
  nombre: string
  ordenRecorrido: number
  ultimaPuestaAlDia: string | null
  vecesAlDia: number
}

export interface Tarea {
  id: string
  ambienteId: string
  subAmbienteId: string | null
  objetoId: string | null
  verbo: Verbo
  descripcion: string
  duracionMin: number
  esfuerzo: 1 | 2 | 3
  impactoVisual: 1 | 2 | 3
  requiere: string[]
  herramientas: string[]
  esDelCatalogo: boolean
  notas: string | null
}

export interface Paso {
  tareaId: string
  estado: EstadoPaso
  hechoEn: string | null
}

export interface Plan {
  id: string
  creadoEn: string
  modo: Modo
  /** Segundos. Se calcula como `presupuestoMin * 60` al crear el plan. null = sin límite. */
  presupuestoSegundos: number | null
  pasos: Paso[]
  cerradoEn: string | null
  minutosFaltantes: number
  advertencias: string[]
}

export interface MetaSesion {
  pasos: number
  minutos: number
}

export interface ResultadoPlan {
  plan: Plan
  meta: MetaSesion
}

export interface EntradaPlan {
  /** Los ambientes que la persona incluyó. Hacen falta para `ordenRecorrido` y `ultimaPuestaAlDia`. */
  ambientes: Ambiente[]
  /** Solo las tareas incluidas por la persona. */
  tareas: Tarea[]
  /** Ids ya completados en el ciclo actual: no vuelven a aparecer en el plan. */
  hechasEnCiclo: string[]
  /** En minutos, para poder comparar con `Tarea.duracionMin`. null = sin límite. */
  presupuestoMin: number | null
  modo: Modo
  herramientasDisponibles: string[]
}
```

- [ ] **Step 2: Escribir el test del validador**

```ts
// src/domain/catalogo/validar.test.ts
import { expect, test } from 'vitest'
import { validarCatalogo } from './validar'
import type { Ambiente, Tarea } from '../tipos'

// Helper: arma un catálogo mínimo válido y permite romperlo de a una cosa.
function catalogoValido() { /* devuelve { ambientes, tareas } con un ambiente y dos tareas,
  una de ellas de 2 min sin dependencias, y la otra que la requiere */ }

test('un catalogo correcto no reporta problemas', () => {
  const { ambientes, tareas } = catalogoValido()
  expect(validarCatalogo(ambientes, tareas)).toEqual([])
})

test('reporta una dependencia que apunta a una tarea inexistente', () => { /* ... */ })
test('reporta un ciclo de dependencias', () => { /* ... */ })
test('reporta duracion cero, verbo invalido o esfuerzo fuera de 1..3', () => { /* ... */ })
test('reporta un ambiente sin ninguna tarea de 2 minutos sin dependencias', () => { /* ... */ })
test('reporta un trapear que no depende de un barrer del mismo ambiente', () => { /* ... */ })
test('reporta dos ambientes con el mismo ordenRecorrido', () => { /* ... */ })
```

Los últimos dos casos se derivan de las reglas de dependencia de la sección 5.4: **seco antes que húmedo**, **arriba antes que abajo**, **sacar antes que limpiar**. Verificá al menos «seco antes que húmedo» de forma explícita: toda tarea cuyo `descripcion` matchee `/trape|lavar el piso|baldear/i` debe declarar en `requiere` una tarea cuyo `descripcion` matchee `/barrer|aspirar/i` del mismo `ambienteId`.

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `node pnpm.mjs test src/domain/catalogo`
Expected: FAIL — `validarCatalogo` no existe.

- [ ] **Step 4: Implementar `validarCatalogo`**

Devuelve `string[]` con un mensaje por problema, describiendo el id culpable. Nunca lanza excepciones.

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `node pnpm.mjs test src/domain/catalogo`
Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add src/domain/tipos.ts src/domain/catalogo
git commit -m "feat: tipos del dominio y validador de integridad del catalogo"
```

---

### Task 5: Catálogo del ambiente cocina

La cocina es el ambiente de referencia, porque es el que la idea original describió con más detalle.

**Files:**
- Create: `src/domain/catalogo/cocina.ts`, `src/domain/catalogo/cocina.test.ts`

**Interfaces:**
- Consumes: `Ambiente`, `Tarea` (Tarea 4), `validarCatalogo` (Tarea 4).
- Produces: `ambienteCocina: Ambiente` y `tareasCocina: Tarea[]`.

- [ ] **Step 1: Escribir el test**

```ts
// src/domain/catalogo/cocina.test.ts
import { expect, test } from 'vitest'
import { ambienteCocina, tareasCocina } from './cocina'
import { validarCatalogo } from './validar'

test('el catalogo de la cocina es integro', () => {
  expect(validarCatalogo([ambienteCocina], tareasCocina)).toEqual([])
})

test('la cocina tiene al menos una tarea de 2 minutos sin dependencias', () => {
  const arranques = tareasCocina.filter((t) => t.duracionMin <= 2 && t.requiere.length === 0)
  expect(arranques.length).toBeGreaterThanOrEqual(1)
})

test('trapear el piso depende de barrer el piso', () => {
  const barrer = tareasCocina.find((t) => /barrer/i.test(t.descripcion))!
  const trapear = tareasCocina.find((t) => /trapear/i.test(t.descripcion))!
  expect(trapear.requiere).toContain(barrer.id)
})

test('cada tarea de la cocina esta completa', () => {
  for (const t of tareasCocina) {
    expect(t.ambienteId).toBe(ambienteCocina.id)
    expect(t.duracionMin).toBeGreaterThan(0)
    expect(t.esDelCatalogo).toBe(true)
  }
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `node pnpm.mjs test src/domain/catalogo/cocina`
Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Escribir el contenido del catálogo de la cocina**

`ordenRecorrido: 3`. Sub-ambientes y objetos: mesada, bachas, hornallas, heladera, alacena, piso, tacho, mesa.

Tareas mínimas, con sus dependencias reales:

| id | verbo | descripción | min | esfuerzo | impacto | requiere |
|---|---|---|---|---|---|---|
| `cocina-tirar-basura` | tirar | tirar la basura y lo que esté vencido en la heladera | 2 | 1 | 2 | — |
| `cocina-guardar-platos` | guardar | guardar los platos limpios del secadero | 2 | 1 | 2 | — |
| `cocina-lavar-platos` | lavar | lavar los platos y las ollas | 10 | 2 | 3 | `cocina-guardar-platos` |
| `cocina-mesada-despejar` | guardar | despejar la mesada | 3 | 1 | 3 | — |
| `cocina-hornallas` | limpiar | limpiar las hornallas | 6 | 3 | 2 | `cocina-mesada-despejar` |
| `cocina-mesada` | limpiar | limpiar la mesada | 4 | 2 | 3 | `cocina-mesada-despejar`, `cocina-lavar-platos` |
| `cocina-barrer` | limpiar | barrer el piso | 5 | 2 | 3 | — |
| `cocina-trapear` | limpiar | trapear el piso | 6 | 2 | 3 | `cocina-barrer` |
| `cocina-heladera` | tirar | tirar lo vencido de la heladera | 4 | 2 | 1 | — |

Herramientas: `cocina-barrer` pide `["escoba"]`; `cocina-trapear` pide `["trapo", "balde"]`; `cocina-hornallas` y `cocina-mesada` piden `["trapo"]`; `cocina-lavar-platos` pide `["detergente"]`; el resto `[]`.

`ultimaPuestaAlDia: null`, `vecesAlDia: 0`.

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `node pnpm.mjs test src/domain/catalogo/cocina`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/domain/catalogo/cocina.ts src/domain/catalogo/cocina.test.ts
git commit -m "feat: catalogo del ambiente cocina"
```

---

### Task 6: Los siete ambientes restantes

**Files:**
- Create: `src/domain/catalogo/ambientes.ts`, `src/domain/catalogo/index.ts`, `src/domain/catalogo/index.test.ts`

**Interfaces:**
- Consumes: Tarea 4 y Tarea 5.
- Produces: `CATALOGO: { ambientes: Ambiente[]; tareas: Tarea[] }`, `ambientePorId(id: string): Ambiente | undefined`, `tareasDeAmbiente(ambienteId: string): Tarea[]`.

- [ ] **Step 1: Escribir el test**

```ts
// src/domain/catalogo/index.test.ts
import { expect, test } from 'vitest'
import { CATALOGO, ambientePorId, tareasDeAmbiente } from './index'
import { validarCatalogo } from './validar'

test('el catalogo completo es integro', () => {
  expect(validarCatalogo(CATALOGO.ambientes, CATALOGO.tareas)).toEqual([])
})

test('estan los ocho ambientes con orden de recorrido unico', () => {
  expect(CATALOGO.ambientes).toHaveLength(8)
  const ordenes = CATALOGO.ambientes.map((a) => a.ordenRecorrido)
  expect(new Set(ordenes).size).toBe(8)
})

test('todos los ambientes tienen un arranque de 2 minutos sin dependencias', () => {
  for (const a of CATALOGO.ambientes) {
    const arranques = tareasDeAmbiente(a.id).filter((t) => t.duracionMin <= 2 && t.requiere.length === 0)
    expect(arranques.length, `el ambiente ${a.tipo} no tiene arranque de 2 minutos`).toBeGreaterThanOrEqual(1)
  }
})

test('cada ambiente tiene al menos cinco tareas', () => {
  for (const a of CATALOGO.ambientes) {
    expect(tareasDeAmbiente(a.id).length, `el ambiente ${a.tipo} tiene muy pocas tareas`).toBeGreaterThanOrEqual(5)
  }
})

test('toda dependencia apunta a una tarea del mismo ambiente', () => {
  for (const t of CATALOGO.tareas) {
    for (const dep of t.requiere) {
      expect(ambientePorId(t.ambienteId)).toBeDefined()
      expect(CATALOGO.tareas.find((otra) => otra.id === dep)?.ambienteId).toBe(t.ambienteId)
    }
  }
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `node pnpm.mjs test src/domain/catalogo/index`
Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Escribir los siete ambientes y ensamblar el catálogo**

`ordenRecorrido`: dormitorio 1, living 2, cocina 3, bano 4, escritorio 5, lavadero 6, balcon 7, garage 8.

Para cada ambiente, seguir el mismo patrón que la cocina: sub-ambientes y objetos propios, entre 5 y 9 tareas, todas con duración, esfuerzo, impacto visual, herramientas y dependencias reales. Cada ambiente necesita al menos una tarea de 2&nbsp;minutos sin dependencias (candidatos naturales: ordenar la cama en el dormitorio, juntar la ropa sucia en el baño, despejar la mesa del living, juntar lo del piso en el escritorio).

Las tres reglas de dependencia aplican en todos: seco antes que húmedo, arriba antes que abajo, sacar antes que limpiar.

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `node pnpm.mjs test src/domain/catalogo`
Expected: PASS, todos los tests del catálogo.

- [ ] **Step 5: Commit**

```bash
git add src/domain/catalogo
git commit -m "feat: catalogo completo de los ocho ambientes"
```

---

### Task 7: Función de puntaje por modo

**Files:**
- Create: `src/domain/motor/puntaje.ts`, `src/domain/motor/puntaje.test.ts`

**Interfaces:**
- Consumes: `Tarea`, `Modo` (Tarea 4).
- Produces: `PESOS: Record<Modo, Pesos>`, `puntaje(tarea: Tarea, contexto: ContextoPuntaje): number`, `VERBO_ORDEN: Record<Verbo, number>`.

```ts
export interface Pesos { wVisual: number; wVelocidad: number; wContinuidad: number; wHerramientas: number }
export interface ContextoPuntaje {
  ambienteAnterior: string | null
  herramientasEnMano: string[]
}
```

- [ ] **Step 1: Escribir el test**

```ts
test('la tabla de pesos coincide con la especificacion', () => {
  expect(PESOS.arrancarYa).toEqual({ wVisual: 3, wVelocidad: 2, wContinuidad: 1, wHerramientas: 1 })
  expect(PESOS.ambientePorAmbiente).toEqual({ wVisual: 1, wVelocidad: 1, wContinuidad: 5, wHerramientas: 1 })
  expect(PESOS.puestaAPunto).toEqual({ wVisual: 2, wVelocidad: 1, wContinuidad: 2, wHerramientas: 1 })
})

test('en arrancarYa el impacto visual pesa mas que la velocidad', () => { /* tarea de 20 min con impacto 3
  supera a una de 2 min con impacto 1 */ })

test('la continuidad de ambiente suma cuando coincide', () => { /* mismo ambiente vs ambiente distinto */ })

test('las herramientas en mano suman cuando estan incluidas', () => { /* subconjunto: suma; falta una: no suma */ })

test('una duracion de cero no rompe la velocidad', () => {
  expect(Number.isFinite(puntaje(tareaConDuracion(0), ctx))).toBe(true)
})

test('el orden de los verbos es guardar, ordenar, limpiar, lavar, tirar', () => {
  expect(VERBO_ORDEN).toEqual({ guardar: 0, ordenar: 1, limpiar: 2, lavar: 3, tirar: 4 })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `node pnpm.mjs test src/domain/motor/puntaje`
Expected: FAIL.

- [ ] **Step 3: Implementar la función de puntaje**

Exactamente la fórmula de la sección 5.2:

```
puntaje = wVisual * impactoVisual
        + wVelocidad * (1 / max(1, duracionMin))
        + wContinuidad * (ambienteId === ambienteAnterior ? 1 : 0)
        + wHerramientas * (toda herramienta requerida está en herramientasEnMano ? 1 : 0)
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `node pnpm.mjs test src/domain/motor/puntaje`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/motor/puntaje.ts src/domain/motor/puntaje.test.ts
git commit -m "feat: funcion de puntaje y pesos por modo"
```

---

### Task 8: Grafo de dependencias y ciclos

**Files:**
- Create: `src/domain/motor/grafo.ts`, `src/domain/motor/grafo.test.ts`

**Interfaces:**
- Consumes: `Tarea` (Tarea 4).
- Produces:
  - `construirGrafo(tareas: Tarea[]): { pendientesDe: Map<string, Set<string>>; advertencias: string[] }` — `pendientesDe.get(id)` son las dependencias de esa tarea que están dentro del conjunto.
  - `resolverCiclos(tareas: Tarea[]): { aristasRotas: string[] }` — elimina la arista de la tarea más larga del ciclo y lo reporta.

- [ ] **Step 1: Escribir el test**

```ts
test('arma las dependencias solo entre las tareas del conjunto', () => { /* una dependencia hacia afuera
  se ignora: cuenta como satisfecha */ })

test('detecta un ciclo de dos tareas', () => { /* a requiere b, b requiere a */ })

test('rompe el ciclo por la tarea mas larga y lo reporta', () => {
  // a (3 min) <-> b (9 min): se rompe la arista de b
  const { aristasRotas } = resolverCiclos([tareaA, tareaB])
  expect(aristasRotas).toHaveLength(1)
  expect(aristasRotas[0]).toContain(tareaB.id)
})

test('no toca un grafo sin ciclos', () => {
  expect(resolverCiclos(grafoAciclico).aristasRotas).toEqual([])
})

test('un ciclo no rompe la resolucion: siempre se puede ordenar', () => { /* tras resolver,
  ninguna tarea tiene pendientes sin resolver */ })
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `node pnpm.mjs test src/domain/motor/grafo`
Expected: FAIL.

- [ ] **Step 3: Implementar el grafo y la ruptura de ciclos**

Detección con recorrido en profundidad y marca de tres colores (blanco, gris, negro). Al encontrar una arista hacia un nodo gris, hay ciclo: se elimina la arista que sale de la tarea de **mayor duración** entre las del ciclo, y se agrega un mensaje a `advertencias`. Repetir hasta que no queden ciclos.

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `node pnpm.mjs test src/domain/motor/grafo`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/motor/grafo.ts src/domain/motor/grafo.test.ts
git commit -m "feat: grafo de dependencias con deteccion y ruptura de ciclos"
```

---

### Task 9: Elección del ambiente y del paso de arranque

Cubre la garantía **G2** y el caso 4 de Review Focus.

**Files:**
- Create: `src/domain/motor/arranque.ts`, `src/domain/motor/arranque.test.ts`

**Interfaces:**
- Consumes: `construirGrafo` (Tarea 8), `puntaje` (Tarea 7).
- Produces:
  - `elegirAmbienteDeArranque(entrada: EntradaPlan, tareasDisponibles: Tarea[]): string`
  - `elegirPasoDeArranque(tareasDelAmbiente: Tarea[], pendientesDe: Map<string, Set<string>>, contexto: ContextoPuntaje, modo: Modo): { tarea: Tarea; advertencia: string | null }`

- [ ] **Step 1: Escribir el test**

Las fechas son literales fijos: el motor es puro y no consulta el reloj.

```ts
import { expect, test } from 'vitest'
import { elegirAmbienteDeArranque, elegirPasoDeArranque } from './arranque'
import type { Ambiente, EntradaPlan, Tarea } from '../tipos'

function ambiente(id: string, extra: Partial<Ambiente> = {}): Ambiente {
  return { id, hogarId: 'h', tipo: 'cocina', nombre: id, ordenRecorrido: 1,
           ultimaPuestaAlDia: null, vecesAlDia: 0, ...extra }
}

function tarea(id: string, ambienteId: string, extra: Partial<Tarea> = {}): Tarea {
  return { id, ambienteId, subAmbienteId: null, objetoId: null, verbo: 'limpiar',
           descripcion: id, duracionMin: 5, esfuerzo: 1, impactoVisual: 1,
           requiere: [], herramientas: [], esDelCatalogo: true, notas: null, ...extra }
}

/** `puestaAlDia` mapea ambienteId -> fecha (o null). */
function entrada(ambientes: Ambiente[], tareas: Tarea[], modo: Modo = 'arrancarYa'): EntradaPlan {
  return { ambientes, tareas, hechasEnCiclo: [], presupuestoMin: null, modo,
           herramientasDisponibles: ['escoba', 'trapo', 'balde', 'detergente'] }
}

const SIN_PENDIENTES = new Map<string, Set<string>>()
const CTX = { ambienteAnterior: null, herramientasEnMano: ['escoba', 'trapo', 'balde'] }

test('elige el ambiente con mas tareas pendientes', () => {
  const ambientes = [ambiente('a'), ambiente('b')]
  const tareas = [tarea('a1', 'a'), tarea('a2', 'a'), tarea('a3', 'a'), tarea('b1', 'b')]
  expect(elegirAmbienteDeArranque(entrada(ambientes, tareas), tareas)).toBe('a')
})

test('en caso de empate gana el de ultimaPuestaAlDia mas antigua', () => {
  const ambientes = [
    ambiente('a', { ultimaPuestaAlDia: '2026-10-08T00:00:00.000Z' }),
    ambiente('b', { ultimaPuestaAlDia: '2026-09-01T00:00:00.000Z' }),
  ]
  const tareas = [tarea('a1', 'a'), tarea('b1', 'b')]
  expect(elegirAmbienteDeArranque(entrada(ambientes, tareas), tareas)).toBe('b')
})

test('si nunca se puso al dia, ese gana el empate', () => {
  const ambientes = [
    ambiente('a', { ultimaPuestaAlDia: '2026-10-08T00:00:00.000Z' }),
    ambiente('b', { ultimaPuestaAlDia: null }),
  ]
  const tareas = [tarea('a1', 'a'), tarea('b1', 'b')]
  expect(elegirAmbienteDeArranque(entrada(ambientes, tareas), tareas)).toBe('b')
})

test('ante empate total desempata por ambienteId ascendente', () => {
  // Review Focus 5
  const ambientes = [ambiente('b'), ambiente('a')]   // el orden del arreglo no debe importar
  const tareas = [tarea('a1', 'a'), tarea('b1', 'b')]
  expect(elegirAmbienteDeArranque(entrada(ambientes, tareas), tareas)).toBe('a')
})

test('en puestaAPunto elige el primero del recorrido, no el mas desordenado', () => {
  const ambientes = [ambiente('a', { ordenRecorrido: 1 }), ambiente('b', { ordenRecorrido: 2 })]
  const tareas = [tarea('a1', 'a'), tarea('b1', 'b'), tarea('b2', 'b'), tarea('b3', 'b')]
  expect(elegirAmbienteDeArranque(entrada(ambientes, tareas, 'puestaAPunto'), tareas)).toBe('a')
})

test('el paso de arranque dura 2 minutos o menos y no tiene pendientes', () => {
  // G2
  const tareas = [
    tarea('corta', 'a', { duracionMin: 2, impactoVisual: 1 }),
    tarea('larga', 'a', { duracionMin: 20, impactoVisual: 3 }),
  ]
  const { tarea: elegida, advertencia } = elegirPasoDeArranque(tareas, SIN_PENDIENTES, CTX, 'arrancarYa')
  expect(elegida.id).toBe('corta')
  expect(elegida.duracionMin).toBeLessThanOrEqual(2)
  expect(advertencia).toBeNull()
})

test('no elige un paso que todavia tiene dependencias pendientes', () => {
  const tareas = [tarea('corta', 'a', { duracionMin: 2 }), tarea('larga', 'a', { duracionMin: 1 })]
  const pendientes = new Map([['larga', new Set(['corta'])]])
  const { tarea: elegida } = elegirPasoDeArranque(tareas, pendientes, CTX, 'arrancarYa')
  expect(elegida.id).toBe('corta')
})

test('si la herramienta faltante borra el unico paso de 2 minutos, usa el respaldo y avisa', () => {
  // Review Focus 4: sin trapo, la unica tarea de 2 min queda filtrada antes de llegar acá
  const tareas = [tarea('corta', 'a', { duracionMin: 2, herramientas: ['trapo'] }),
                  tarea('media', 'a', { duracionMin: 5 })]
  const sinTrapo = { ambienteAnterior: null, herramientasEnMano: ['escoba'] }
  const { tarea: elegida, advertencia } = elegirPasoDeArranque(tareas, SIN_PENDIENTES, sinTrapo, 'arrancarYa')
  expect(elegida.duracionMin).toBeLessThanOrEqual(5)
  expect(advertencia).toMatch(/2 minutos|arranque/i)
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `node pnpm.mjs test src/domain/motor/arranque`
Expected: FAIL.

- [ ] **Step 3: Implementar las dos funciones**

`elegirAmbienteDeArranque`: cuenta tareas con estado pendiente por ambiente entre `tareasDisponibles`; para `arrancarYa` y `ambientePorAmbiente` gana el máximo, desempatando por `ultimaPuestaAlDia` más antigua (nulo gana), y después por `ambienteId` ascendente. Para `puestaAPunto` gana el menor `ordenRecorrido` **con tareas disponibles**, desempatando por `ambienteId`.

`elegirPasoDeArranque`: entre las tareas del ambiente sin dependencias pendientes, la de mayor `puntaje` con `duracionMin <= 2`. Si no hay ninguna, la más corta de ese ambiente y `advertencia` con el motivo.

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `node pnpm.mjs test src/domain/motor/arranque`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/motor/arranque.ts src/domain/motor/arranque.test.ts
git commit -m "feat: eleccion del ambiente y del paso de arranque"
```

---

### Task 10: Orden del resto del plan

Cubre **G1**, **G3** y **G5**, y el caso 5 de Review Focus.

**Files:**
- Create: `src/domain/motor/ordenar.ts`, `src/domain/motor/ordenar.test.ts`

**Interfaces:**
- Consumes: `puntaje` y `VERBO_ORDEN` (Tarea 7), `construirGrafo` (Tarea 8).
- Produces: `ordenarResto(opciones: { tareas: Tarea[]; pendientesDe: Map<string, Set<string>>; modo: Modo; ambienteDeArranque: string }): Tarea[]`

- [ ] **Step 1: Escribir el test**

```ts
test('ninguna tarea aparece antes que sus dependencias', () => { /* G1, sobre el catalogo completo */ })

test('trapear nunca aparece antes de barrer en ningun modo', () => { /* G3, los tres modos */ })

test('la misma entrada produce el mismo orden cien veces', () => {
  // G5
  const primero = ordenarResto(opciones).map((t) => t.id)
  for (let i = 0; i < 100; i++) {
    expect(ordenarResto(opciones).map((t) => t.id)).toEqual(primero)
  }
})

test('en arrancarYa alterna menos entre ambientes que en puestaAPunto', () => { /* cuenta de cambios
  de ambiente: arrancarYa <= puestaAPunto */ })

test('en puestaAPunto los ambientes salen en orden de recorrido', () => { /* dormitorio antes que cocina */ })

test('empate total se resuelve por ambienteId y despues por id de tarea', () => {
  // Review Focus 5
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `node pnpm.mjs test src/domain/motor/ordenar`
Expected: FAIL.

- [ ] **Step 3: Implementar el ordenamiento**

Orden topológico por selección repetida: en cada vuelta, entre las tareas cuyas dependencias ya fueron colocadas, elegir la mejor según el modo.

- `arrancarYa` y `ambientePorAmbiente`: mayor `puntaje`, con `ambienteAnterior` actualizándose a medida que se coloca cada tarea.
- `puestaAPunto`: primero menor `ordenRecorrido` del ambiente, después menor `VERBO_ORDEN`, después mayor `puntaje`.

En todos los modos el desempate final es `ambienteId` ascendente y luego `id` de tarea ascendente. **Nunca** usar el orden de inserción de un `Set` ni de un `Object.keys` como desempate: es lo que rompe G5 entre navegadores.

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `node pnpm.mjs test src/domain/motor/ordenar`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/motor/ordenar.ts src/domain/motor/ordenar.test.ts
git commit -m "feat: ordenamiento topologico con comparador por modo"
```

---

### Task 11: Recorte al presupuesto

Cubre **G4** y **G6**, y el caso 1 de Review Focus.

**Files:**
- Create: `src/domain/motor/presupuesto.ts`, `src/domain/motor/presupuesto.test.ts`

**Interfaces:**
- Consumes: `Tarea` (Tarea 4), `construirGrafo` (Tarea 8).
- Produces: `recortarAlPresupuesto(tareasOrdenadas: Tarea[], pendientesDe: Map<string, Set<string>>, presupuestoMin: number | null): { conservadas: Tarea[]; minutosFaltantes: number; advertencias: string[] }`

- [ ] **Step 1: Escribir el test**

```ts
test('sin presupuesto conserva todo y no falta nada', () => {
  expect(recortarAlPresupuesto(orden, deps, null)).toEqual({ conservadas: orden, minutosFaltantes: 0, advertencias: [] })
})

test('nunca se pasa del presupuesto', () => {
  // G4
  const { conservadas } = recortarAlPresupuesto(orden, deps, 20)
  expect(sumaMinutos(conservadas)).toBeLessThanOrEqual(20)
})

test('si una tarea no entra, sus dependientes tampoco', () => {
  // barrer (30 min) no entra en 10 con trapear dependiendo de barrer
  const { conservadas } = recortarAlPresupuesto([barrer, trapear], deps, 10)
  expect(conservadas.map((t) => t.id)).toEqual([])
})

test('informa los minutos que faltan para terminar', () => {
  const { minutosFaltantes } = recortarAlPresupuesto(orden, deps, 10)
  expect(minutosFaltantes).toBe(sumaMinutos(orden) - 10)
})

test('con presupuesto insuficiente lo dice en vez de devolver nada en silencio', () => {
  // Review Focus 1 / G6
  const { conservadas, advertencias, minutosFaltantes } = recortarAlPresupuesto([tareaDe20], deps, 10)
  expect(conservadas).toEqual([])
  expect(advertencias.length).toBeGreaterThan(0)
  expect(minutosFaltantes).toBe(20)
})

test('presupuesto cero o negativo no rompe nada', () => { /* conservadas vacio, advertencia presente */ })
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `node pnpm.mjs test src/domain/motor/presupuesto`
Expected: FAIL.

- [ ] **Step 3: Implementar el recorte**

Recorrer la lista ordenada acumulando minutos. Una tarea se conserva solo si su suma no supera el presupuesto **y** todas sus dependencias fueron conservadas. Como el orden es topológico, las dependencias ya fueron decididas. `minutosFaltantes` es la suma de las duraciones de las descartadas.

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `node pnpm.mjs test src/domain/motor/presupuesto`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/motor/presupuesto.ts src/domain/motor/presupuesto.test.ts
git commit -m "feat: recorte al presupuesto con minutos faltantes"
```

---

### Task 12: `generarPlan`, el motor ensamblado

**Files:**
- Create: `src/domain/motor/generarPlan.ts`, `src/domain/motor/generarPlan.test.ts`

**Interfaces:**
- Consumes: todo lo anterior, más el catálogo completo (Tarea 6).
- Produces: `generarPlan(entrada: EntradaPlan, ahora: string, idPlan: string): ResultadoPlan`

`ahora` y `idPlan` entran por parámetro justamente para que el motor siga siendo puro.

- [ ] **Step 1: Escribir el test de integración**

Los tests corren contra el **catálogo real** (Tarea 6), no contra fixtures: es la única forma de comprobar que las garantías valen sobre el contenido que la gente va a usar.

```ts
import { expect, test } from 'vitest'
import { generarPlan } from './generarPlan'
import { CATALOGO } from '../catalogo'
import type { EntradaPlan, Modo } from '../tipos'

const AHORA = '2026-10-10T21:00:00.000Z'

/** Una casa entera: los ocho ambientes y todas sus tareas, sin nada hecho todavía. */
function casaCompleta(modo: Modo, presupuestoMin: number | null = null): EntradaPlan {
  return {
    ambientes: CATALOGO.ambientes,
    tareas: CATALOGO.tareas,
    hechasEnCiclo: [],
    presupuestoMin,
    modo,
    herramientasDisponibles: ['escoba', 'trapo', 'balde', 'detergente', 'aspiradora'],
  }
}

const ids = (e: EntradaPlan) => generarPlan(e, AHORA, 'plan-1').plan.pasos.map((p) => p.tareaId)

test('el plan empieza por un paso de 2 minutos como maximo, en los tres modos', () => {
  // G2
  for (const modo of ['arrancarYa', 'ambientePorAmbiente', 'puestaAPunto'] as Modo[]) {
    const primero = CATALOGO.tareas.find((t) => t.id === ids(casaCompleta(modo))[0])!
    expect(primero.duracionMin, `modo ${modo}`).toBeLessThanOrEqual(2)
    expect(primero.requiere, `modo ${modo}`).toEqual([])
  }
})

test('ninguna tarea aparece antes que sus dependencias', () => {
  // G1
  for (const modo of ['arrancarYa', 'ambientePorAmbiente', 'puestaAPunto'] as Modo[]) {
    const secuencia = ids(casaCompleta(modo))
    const posicion = new Map(secuencia.map((id, i) => [id, i]))
    for (const t of CATALOGO.tareas) {
      if (!posicion.has(t.id)) continue
      for (const dep of t.requiere) {
        if (!posicion.has(dep)) continue
        expect(posicion.get(dep)!, `${modo}: ${dep} debe ir antes que ${t.id}`).toBeLessThan(posicion.get(t.id)!)
      }
    }
  }
})

test('nunca se pasa del presupuesto elegido', () => {
  // G4
  for (const presupuesto of [5, 10, 20, 60]) {
    const entrada = casaCompleta('arrancarYa', presupuesto)
    const { plan, meta } = generarPlan(entrada, AHORA, 'plan-1')
    const minutos = plan.pasos
      .map((p) => CATALOGO.tareas.find((t) => t.id === p.tareaId)!.duracionMin)
      .reduce((a, b) => a + b, 0)
    expect(minutos, `presupuesto ${presupuesto}`).toBeLessThanOrEqual(presupuesto)
    expect(meta.minutos).toBe(minutos)
  }
})

test('la misma entrada produce exactamente el mismo plan cien veces', () => {
  // G5
  const primero = ids(casaCompleta('arrancarYa'))
  for (let i = 0; i < 100; i++) {
    expect(ids(casaCompleta('arrancarYa'))).toEqual(primero)
  }
})

test('las tareas ya hechas en el ciclo no vuelven a aparecer', () => {
  const entrada = { ...casaCompleta('arrancarYa'), hechasEnCiclo: ['cocina-barrer'] }
  expect(ids(entrada)).not.toContain('cocina-barrer')
})

test('sin tareas disponibles devuelve un plan vacio con advertencia, no una excepcion', () => {
  // Review Focus 2
  const { plan, meta } = generarPlan({ ...casaCompleta('arrancarYa'), tareas: [] }, AHORA, 'plan-1')
  expect(plan.pasos).toEqual([])
  expect(meta.pasos).toBe(0)
  expect(plan.advertencias.length).toBeGreaterThan(0)
})

test('los tres modos producen ordenes distintos sobre la misma casa', () => {
  const a = ids(casaCompleta('arrancarYa'))
  const b = ids(casaCompleta('ambientePorAmbiente'))
  const c = ids(casaCompleta('puestaAPunto'))
  expect(a).not.toEqual(b)
  expect(b).not.toEqual(c)
  expect(a).not.toEqual(c)
})

test('el plan guarda el presupuesto en segundos y la meta en minutos', () => {
  const { plan, meta } = generarPlan(casaCompleta('arrancarYa', 20), AHORA, 'plan-1')
  expect(plan.presupuestoSegundos).toBe(1200)
  expect(meta.minutos).toBeLessThanOrEqual(20)
})

test('sin limite el presupuesto guardado es nulo', () => {
  expect(generarPlan(casaCompleta('arrancarYa', null), AHORA, 'plan-1').plan.presupuestoSegundos).toBeNull()
})

test('todos los pasos nacen pendientes y sin fecha', () => {
  for (const paso of generarPlan(casaCompleta('arrancarYa'), AHORA, 'plan-1').plan.pasos) {
    expect(paso.estado).toBe('pendiente')
    expect(paso.hechoEn).toBeNull()
  }
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `node pnpm.mjs test src/domain/motor/generarPlan`
Expected: FAIL.

- [ ] **Step 3: Implementar `generarPlan` con los siete pasos**

1. Filtrar: descartar las que requieren herramientas no disponibles y las que están en `hechasEnCiclo`.
2. Construir el grafo y resolver ciclos.
3. Elegir el ambiente de arranque.
4. Elegir el paso de arranque.
5. Ordenar el resto y anteponer el paso de arranque.
6. Recortar al presupuesto.
7. Devolver el plan y la meta.

`Plan.creadoEn = ahora`, `Plan.id = idPlan`, `Plan.presupuestoSegundos = presupuestoMin === null ? null : presupuestoMin * 60`, `Plan.cerradoEn = null`. `MetaSesion` es la cantidad de pasos y la suma de minutos de los pasos conservados. Las advertencias del grafo, del arranque y del presupuesto se acumulan en `Plan.advertencias`.

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `node pnpm.mjs test src/domain/motor`
Expected: PASS, todos los tests del motor.

- [ ] **Step 5: Verificar que el dominio es puro**

Run: `node pnpm.mjs lint` con una regla `no-restricted-globals`/`no-restricted-syntax` para `Date` y `Math.random` dentro de `src/domain/**`. Además:

```bash
grep -rnE "Date\.now|new Date|Math\.random" src/domain/
```
Expected: sin resultados.

- [ ] **Step 6: Commit**

```bash
git add src/domain/motor
git commit -m "feat: motor de orden completo y determinístico"
```

---

### Task 13: Repositorio e implementación local

Cubre el caso 3 de Review Focus en su mitad de datos.

**Files:**
- Create: `src/data/repositorio.ts`, `src/data/repositorioLocal.ts`, `src/data/repositorioLocal.test.ts`

**Interfaces:**
- Consumes: los tipos (Tarea 4).
- Produces: la interfaz `Repositorio` y `crearRepositorioLocal(): Repositorio`.

```ts
export interface Repositorio {
  /** Ambientes que la persona eligió, con su estado de ciclo. */
  listarAmbientes(): Promise<Ambiente[]>
  guardarAmbiente(ambiente: Ambiente): Promise<void>
  eliminarAmbiente(ambienteId: string): Promise<void>

  listarTareas(ambienteId: string): Promise<Tarea[]>
  guardarTarea(tarea: Tarea): Promise<void>
  eliminarTarea(tareaId: string): Promise<void>

  /** Ids de tareas hechas en el ciclo actual de un ambiente. */
  listarHechas(ambienteId: string): Promise<string[]>
  marcarHecha(tareaId: string, hechoEn: string): Promise<void>

  guardarPlan(plan: Plan): Promise<void>
  obtenerPlan(planId: string): Promise<Plan | null>
  ultimoPlan(): Promise<Plan | null>

  preferencias(): Promise<{ herramientasDisponibles: string[]; modoPorDefecto: Modo }>
  guardarPreferencias(p: { herramientasDisponibles: string[]; modoPorDefecto: Modo }): Promise<void>

  borrarTodo(): Promise<void>
}
```

- [ ] **Step 1: Escribir el test**

```ts
import 'fake-indexeddb/auto'

test('guarda y recupera un ambiente', async () => { /* ida y vuelta, mismo objeto */ })

test('guarda y recupera una tarea', async () => { /* ida y vuelta */ })

test('no guarda una tarea con descripcion vacia o solo espacios', () => {
  // Review Focus 3
  const repo = crearRepositorioLocal()
  await expect(repo.guardarTarea({ ...tareaBase, descripcion: '   ' })).rejects.toThrow()
})

test('marca una tarea como hecha y la lista', async () => { /* listarHechas incluye el id */ })

test('guarda el plan y lo devuelve como ultimo plan', async () => { /* ultimoPlan() */ })

test('las preferencias tienen valores por defecto sensatos', async () => {
  const p = await crearRepositorioLocal().preferencias()
  expect(p.modoPorDefecto).toBe('arrancarYa')
  expect(p.herramientasDisponibles).toContain('escoba')
})

test('borrarTodo deja el repositorio vacio', async () => { /* todas las listas vacias */ })
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `node pnpm.mjs test src/data`
Expected: FAIL.

- [ ] **Step 3: Implementar `repositorioLocal` con Dexie**

Tablas: `ambientes`, `tareas`, `hechas`, `planes`, `preferencias`. `guardarTarea` valida que `descripcion.trim()` no sea vacío y lanza si lo es.

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `node pnpm.mjs test src/data`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data
git commit -m "feat: repositorio con implementacion local en IndexedDB"
```

---

### Task 14: Estado global y ruteo con la URL como fuente de verdad

**Files:**
- Create: `src/ui/estado/sesion.ts`, `src/App.test.tsx` (modificar), `src/ui/pantallas/PrimeraVez.tsx` (placeholder mínimo)
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `Repositorio` (Tarea 13), `generarPlan` (Tarea 12).
- Produces: `useSesion` (store de Zustand) con `ambientes`, `tareas`, `planActual`, `pasoActual`, `cargar()`, `avanzar()`, `saltear()`, `reordenar()`; y las rutas `/`, `/armar/:ambienteId`, `/sesion/nueva`, `/plan/:planId`.

- [ ] **Step 1: Escribir el test de navegación**

```tsx
test('la ruta raiz muestra la pantalla de eleccion de ambientes', () => { /* MemoryRouter initialEntries={['/']} */ })

test('la ruta del plan incluye el id del plan en la URL', () => { /* ['/plan/abc'] renderiza la pantalla del plan */ })

test('volver atras no pierde la sesion en curso', () => {
  // Regla de AGENTS.md
  // navegar / -> /sesion/nueva -> atras: el estado del store sigue intacto
})

test('cada ruta cambia el titulo del documento', () => { /* Regla: <title> refleja el contexto */ })
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `node pnpm.mjs test src/App.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar el store y el ruteo**

`App.tsx` monta `BrowserRouter` con las cuatro rutas. El store guarda el estado en memoria y lo persiste con el repositorio; la URL identifica el plan en curso, y el estado del store sobrevive a la navegación hacia atrás porque vive fuera del árbol de rutas.

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `node pnpm.mjs test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/ui/estado src/ui/pantallas
git commit -m "feat: estado global y ruteo con el estado en la URL"
```

---

### Task 15: Pantalla «¿Qué querés ordenar?»

Cubre la mitad de interfaz del caso 2 de Review Focus.

**Files:**
- Create: `src/ui/pantallas/PrimeraVez.tsx`, `src/ui/pantallas/PrimeraVez.test.tsx`, `src/ui/componentes/EstadoVacio.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `CATALOGO` (Tarea 6), `Repositorio` (Tarea 13), `useSesion` (Tarea 14).
- Produces: componente `EstadoVacio({ titulo, accion })` reutilizable.

- [ ] **Step 1: Escribir el test**

```tsx
test('muestra un chip por cada ambiente del catalogo', () => {
  render(<PrimeraVez />)
  expect(screen.getAllByRole('checkbox')).toHaveLength(8)
})

test('los chips son accesibles por teclado y por nombre', () => {
  expect(screen.getByRole('checkbox', { name: /cocina/i })).toBeInTheDocument()
})

test('sin ningun ambiente elegido el boton esta deshabilitado y se explica por que', () => {
  // Review Focus 2
  expect(screen.getByRole('button', { name: /armá/i })).toBeDisabled()
  expect(screen.getByText(/elegí al menos un ambiente/i)).toBeInTheDocument()
})

test('elegir un ambiente habilita el avance', async () => { /* user-event click -> enabled */ })

test('no pide cuenta ni registro en ningun momento', () => {
  expect(screen.queryByText(/contraseña|registr|email/i)).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `node pnpm.mjs test src/ui/pantallas/PrimeraVez`
Expected: FAIL.

- [ ] **Step 3: Implementar la pantalla**

Un `<h1>` con «¿Qué querés ordenar?», los ocho ambientes como chips con `role="checkbox"` (checkbox real con `<label>` que lo envuelve, no un `<div>`), y un botón «Armá las tareas». Al elegir un ambiente, se copian sus tareas del catálogo al repositorio. Área táctil ≥ 44&nbsp;px. El estado vacío usa `EstadoVacio` y está dentro de `<main>`.

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `node pnpm.mjs test src/ui/pantallas/PrimeraVez`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/pantallas/PrimeraVez.tsx src/ui/pantallas/PrimeraVez.test.tsx src/ui/componentes/EstadoVacio.tsx src/App.tsx
git commit -m "feat: pantalla de eleccion de ambientes"
```

---

### Task 16: Pantalla de armado del ambiente

Cubre la mitad de interfaz del caso 3 de Review Focus.

**Files:**
- Create: `src/ui/pantallas/Armado.tsx`, `src/ui/pantallas/Armado.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `tareasDeAmbiente` (Tarea 6), `Repositorio` (Tarea 13).
- Produces: nada que otras tareas consuman.

- [ ] **Step 1: Escribir el test**

```tsx
test('muestra las tareas del ambiente agrupadas por objeto', () => {
  render(<Armado />, { wrapper: rutaCon('/armar/cocina-1') })
  expect(screen.getByRole('heading', { name: /mesada/i })).toBeInTheDocument()
})

test('las tareas esenciales vienen tildadas por defecto', () => {
  expect(screen.getByRole('checkbox', { name: /lavar los platos/i })).toBeChecked()
})

test('destildar una tarea la deja fuera del plan', async () => { /* togglear y verificar el store */ })

test('agrega una tarea propia y la guarda', async () => {
  await user.type(screen.getByLabelText(/agregar algo mío/i), 'regar las plantas')
  await user.click(screen.getByRole('button', { name: /agregar/i }))
  expect(screen.getByText(/regar las plantas/i)).toBeInTheDocument()
})

test('no guarda una tarea propia con nombre vacío', async () => {
  // Review Focus 3
  await user.type(screen.getByLabelText(/agregar algo mío/i), '   ')
  await user.click(screen.getByRole('button', { name: /agregar/i }))
  expect(screen.getByRole('alert')).toBeInTheDocument()
})

test('un nombre de 150 caracteres no rompe el layout ni desborda', async () => {
  // Review Focus 3
  const largo = 'limpiar el mueble del living que tiene todos los libros y las revistas viejas apiladas y tambien las cajas'
  expect(largo.length).toBeGreaterThan(100)
  // el contenedor tiene la clase que trunca y el texto completo sigue accesible
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `node pnpm.mjs test src/ui/pantallas/Armado`
Expected: FAIL.

- [ ] **Step 3: Implementar la pantalla**

Lista agrupada por objeto, cada tarea con su `<label>` envolviendo el checkbox (un solo blanco de toque generoso, sin zonas muertas), su duración en minutos con espacio duro, y un formulario al final para agregar una tarea propia con un campo de texto y un botón. Los nombres largos se truncan con `line-clamp` y el contenedor lleva `min-w-0`.

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `node pnpm.mjs test src/ui/pantallas/Armado`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/pantallas/Armado.tsx src/ui/pantallas/Armado.test.tsx src/App.tsx
git commit -m "feat: pantalla de armado del ambiente"
```

---

### Task 17: Pantalla de arranque de sesión

**Files:**
- Create: `src/ui/pantallas/ArranqueSesion.tsx`, `src/ui/pantallas/ArranqueSesion.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `generarPlan` (Tarea 12), `Repositorio` (Tarea 13).
- Produces: nada que otras tareas consuman.

- [ ] **Step 1: Escribir el test**

```tsx
test('ofrece exactamente 10, 20, 30, 60 minutos y sin límite', () => {
  const opciones = screen.getAllByRole('radio').map((r) => r.getAttribute('value'))
  expect(opciones).toEqual(['10', '20', '30', '60', 'sinLimite'])
})

test('arrancarYa viene preseleccionado y explicado en una línea', () => {
  expect(screen.getByRole('radio', { name: /arrancar ya/i })).toBeChecked()
  expect(screen.getByText(/victoria rápida/i)).toBeInTheDocument()
})

test('el botón dice exactamente lo que va a pasar', () => {
  expect(screen.getByRole('button', { name: 'Armá el plan' })).toBeInTheDocument()
})

test('genera un plan y navega a su ruta', async () => { /* /plan/<id> */ })

test('no permite generar un plan sin ninguna tarea tildada', async () => {
  // Review Focus 2
  expect(screen.getByRole('button', { name: 'Armá el plan' })).toBeDisabled()
  expect(screen.getByText(/no hay ninguna tarea/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `node pnpm.mjs test src/ui/pantallas/ArranqueSesion`
Expected: FAIL.

- [ ] **Step 3: Implementar la pantalla**

Grupo de radios para el tiempo, grupo de radios para el modo, y un único botón «Armá el plan».

El botón es la **frontera del mundo impuro**: acá sí se consulta el reloj y se genera el identificador, y es el único lugar donde eso pasa. El motor no los inventa.

```ts
const ahora = new Date().toISOString()
const idPlan = crypto.randomUUID()
const { plan, meta } = generarPlan(
  {
    ambientes: ambientesElegidos,
    tareas: tareasIncluidas,
    hechasEnCiclo: idsHechos,
    presupuestoMin: esSinLimite ? null : minutos,
    modo,
    herramientasDisponibles,
  },
  ahora,
  idPlan,
)
await repositorio.guardarPlan(plan)
navigate(`/plan/${idPlan}`)
```

El tiempo elegido se guarda como `presupuestoMin`, y `generarPlan` lo convierte a segundos dentro del `Plan`. No convertir a mano en la pantalla.

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `node pnpm.mjs test src/ui/pantallas/ArranqueSesion`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/pantallas/ArranqueSesion.tsx src/ui/pantallas/ArranqueSesion.test.tsx src/App.tsx
git commit -m "feat: pantalla de arranque de sesion con tiempo y modo"
```

---

### Task 18: La pantalla del plan

Es la pantalla central del producto. Una sola tarea grande, un solo botón grande.

**Files:**
- Create: `src/ui/pantallas/Plan.tsx`, `src/ui/pantallas/Plan.test.tsx`, `src/ui/componentes/PasoActual.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `Plan`, `Tarea` (Tarea 4), `useSesion` (Tarea 14).
- Produces: nada que otras tareas consuman.

- [ ] **Step 1: Escribir el test**

```tsx
test('muestra una sola tarea: la actual', () => {
  render(<Plan />, { wrapper: rutaCon('/plan/plan-1') })
  expect(screen.getAllByRole('article')).toHaveLength(1)
})

test('el verbo va primero y en grande', () => { /* "Trapeá" antes que "el piso" */ })

test('el botón Listo avanza al paso siguiente', async () => { /* el artículo cambia */ })

test('anuncia el paso nuevo con aria-live polite', async () => {
  await user.click(screen.getByRole('button', { name: 'Listo' }))
  const region = screen.getByRole('status')
  expect(region).toHaveAttribute('aria-live', 'polite')
  expect(region).toHaveTextContent(/barrer/i)
})

test('saltear deja el paso como salteado y avanza', () => { /* estado 'salteado' */ })

test('reordenar regenera el plan sobre las tareas que quedan', () => { /* nueva secuencia, sin las hechas */ })

test('recuerda las herramientas que hacen falta para el paso actual', () => {
  expect(screen.getByText(/trapo/i)).toBeInTheDocument()
})

test('al terminar el último paso muestra el cierre y no un error', () => { /* estado final */ })

test('si el plan quedó vacío explica por qué y ofrece seguir', () => {
  // Review Focus 1 y 2
  expect(screen.getByRole('status')).toHaveTextContent(/minutos/i)
  expect(screen.getByRole('button', { name: /seguir/i })).toBeInTheDocument()
})

test('la barra de progreso usa números tabulares', () => { /* la clase está presente */ })

test('los controles Saltear y No puedo ahora tienen 44px de alto', () => { /* la clase de tamaño está */ })
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `node pnpm.mjs test src/ui/pantallas/Plan`
Expected: FAIL.

- [ ] **Step 3: Implementar `PasoActual` y `Plan`**

`PasoActual` es un `<article>` con el verbo en grande, la descripción, el ambiente, los minutos con espacio duro, y las herramientas necesarias. Debajo, un `<button>` grande «Listo», y las acciones secundarias *Saltear*, *No puedo ahora* y *Reordenar*, todas de 44&nbsp;px. Arriba, la barra de progreso con `font-variant-numeric: tabular-nums` y el contador «3 de 9». Una región con `role="status"` y `aria-live="polite"` anuncia el paso nuevo cada vez que cambia.

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `node pnpm.mjs test src/ui/pantallas/Plan`
Expected: PASS.

- [ ] **Step 5: Verificar el ancho mínimo**

Con el servidor de desarrollo andando, abrir el navegador en 360&nbsp;px de ancho y comprobar que no hay scroll horizontal y que el paso se lee de un vistazo.

- [ ] **Step 6: Commit**

```bash
git add src/ui/pantallas/Plan.tsx src/ui/pantallas/Plan.test.tsx src/ui/componentes/PasoActual.tsx src/App.tsx
git commit -m "feat: pantalla del plan con paso actual y progreso"
```

---

### Task 19: PWA instalable y sin conexión

**Files:**
- Create: `public/manifest.webmanifest`, `public/iconos/` (192, 512 y 512 maskable)
- Modify: `vite.config.ts`, `index.html`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: una app instalable que arranca sin conexión.

- [ ] **Step 1: Escribir el test del manifiesto**

```ts
test('el manifiesto tiene lo mínimo para instalarse', () => {
  const m = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'))
  expect(m.name).toBe('Por dónde empiezo')
  expect(m.short_name).toBeTruthy()
  expect(m.start_url).toBe('/')
  expect(m.display).toBe('standalone')
  expect(m.icons.some((i: { sizes: string }) => i.sizes === '192x192')).toBe(true)
  expect(m.icons.some((i: { sizes: string }) => i.sizes === '512x512')).toBe(true)
  expect(m.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true)
})

test('el html alinea el color del navegador con el fondo y respeta el notch', () => {
  const html = readFileSync('index.html', 'utf8')
  expect(html).toMatch(/<meta name="theme-color"/)
  expect(html).toMatch(/viewport-fit=cover/)
  expect(html).not.toMatch(/maximum-scale|user-scalable\s*=\s*no/)
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `node pnpm.mjs test public`
Expected: FAIL — el manifiesto no existe.

- [ ] **Step 3: Configurar `vite-plugin-pwa` y escribir el manifiesto y los íconos**

Estrategia de precacheo del app shell. `viewport-fit=cover` en el `viewport` para que `env(safe-area-inset-*)` funcione en iOS.

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `node pnpm.mjs test public`
Expected: PASS.

- [ ] **Step 5: Verificar la instalación y el modo sin conexión**

Run: `node pnpm.mjs build && node pnpm.mjs preview`
En el navegador del celular: instalar la app, cerrarla, poner el teléfono en modo avión, y abrirla. Tiene que arrancar y mostrar la pantalla de elección de ambientes.

- [ ] **Step 6: Commit**

```bash
git add public vite.config.ts index.html
git commit -m "feat: PWA instalable y funcional sin conexion"
```

---

### Task 20: Verificación final en dispositivo y revisión contra `AGENTS.md`

**Files:**
- Modify: `src/ui/estilos/estilos.test.ts` (si la revisión encuentra reglas nuevas que verificar), `docs/superpowers/specs/2026-10-10-por-donde-empiezo-design.md` (solo la sección 16, para registrar lo aprendido)

**Interfaces:**
- Consumes: el entregable entero.
- Produces: el entregable 1 dado por terminado, o una lista priorizada de lo que falta.

- [ ] **Step 1: Correr toda la batería de tests y el lint**

Run: `node pnpm.mjs test && node pnpm.mjs lint`
Expected: todo en verde, sin tests salteados.

- [ ] **Step 2: Recorrer la lista de verificación en dispositivo de la sección 11.2**

Chrome en Android y Safari en iOS, en un teléfono real. Los diez puntos. Anotar cada uno como pasa o falla.

- [ ] **Step 3: Revisar la interfaz contra `AGENTS.md`, punto por punto**

Incluida la tabla de excepciones y las doce reglas propias.

- [ ] **Step 4: Manejar cada falla encontrada con el skill `systematic-debugging`**

No parchear a ojo. Si aparece un bug, se diagnostica la causa raíz antes de tocar el código.

- [ ] **Step 5: Verificar el contraste final**

Cada par texto/fondo en uso tiene que cumplir WCAG 2.2 AA, medido, no estimado.

- [ ] **Step 6: Registrar el resultado y commitear**

```bash
git add -A
git commit -m "test: verificacion en dispositivo y revision contra las reglas de interfaz"
```

---

## Autorevisión del plan

**Cobertura de la especificación (entregable 1):**

| Requisito de la especificación | Tarea |
|---|---|
| 3.1 `domain/` puro | Tareas 4 a 12, y el paso 5 de la Tarea 12 |
| 3.2 `data/` con interfaz e implementación local | Tarea 13 |
| 3.3 `ui/` React | Tareas 14 a 18 |
| 4. Modelo de datos | Tarea 4 |
| 5.2 Siete pasos del algoritmo | Tareas 7 a 12 |
| 5.3 G1, G2, G3, G5 | Tareas 9, 10, 12 |
| 5.3 G4, G6 | Tarea 11 |
| 5.4 Catálogo y sus cinco obligaciones | Tareas 4, 5, 6 |
| 7. Pantallas 1 a 4 | Tareas 15 a 18 |
| 8. Accesibilidad y rendimiento | Tarea 3, y verificación en Tareas 15 a 20 |
| 11.1 Tests automáticos | Todas las tareas, cada una con su ciclo |
| 11.2 Verificación en dispositivo | Tareas 18 y 20 |
| 12. Entregable 1 y su definición de terminado | Tarea 20 |
| 13.1 y 13.2 Reglas de interfaz | Tarea 3 (como test) y Tarea 20 |
| 13.3 Plan visual | Tarea 1 |

**Queda fuera de este plan, por pertenecer a otros entregables:** sesiones e historial (entregable 2); la derivación del estado del ambiente (`pendiente` / `aMedioCamino` / `alDia`), el plano de la casa, los logros, la acción «Arrancar de nuevo este ambiente» y la pantalla de regreso (entregable 3); contrarreloj (entregable 4); cuentas y sincronización (entregable 5); y toda la fase 2 de IA. Cada uno tendrá su propio plan cuando el anterior funcione.

**Consistencia de tipos:** `generarPlan(entrada, ahora, idPlan)` es la única puerta al motor y recibe `EntradaPlan` en minutos; el `Plan` resultante guarda segundos. La conversión ocurre en un solo lugar, dentro de `generarPlan`. Los nombres de campos usados en las Tareas 13 a 18 son los de `tipos.ts` de la Tarea 4.

**Proporción:** el plan ocupa alrededor de 1700 líneas contra 600 de la especificación, casi tres veces más. Lo revisé y la desproporción es de **amplitud, no de transcripción**: 20 tareas con cinco pasos cada una, y los bloques de código son mayormente tests —que la propia metodología exige escritos como código, con sus aserciones y los valores exactos de la especificación— más dos bloques de implementación: los tipos del dominio y la frontera impura del botón «Armá el plan». Ningún cuerpo de función del motor está transcripto: de cada uno se fija la firma, el archivo y los valores que la especificación determina.

**Correcciones que la autorevisión encontró en la especificación y en el propio plan:**

1. `EntradaPlan` necesitaba los `Ambiente`, no un mapa aparte de `ultimaPuestaAlDia`: sin ellos el motor no puede leer `ordenRecorrido` y la garantía G2 en modo `puestaAPunto` era imposible de implementar. Se eliminó el campo redundante.
2. Varios tests del plan estaban escritos como comentarios en vez de aserciones, justo en las garantías G1, G2 y G4. Reescritos con valores reales, contra el catálogo real.
3. `generarPlan` es puro y no puede inventar la fecha ni el identificador del plan. Quedó explícito que eso ocurre en la pantalla de arranque de sesión, en un solo lugar.

**Review Focus:** las cinco líneas tienen test asignado — caso 1 en Tarea 11, caso 2 en Tareas 12 y 15, caso 3 en Tareas 13 y 16, caso 4 en Tarea 9, caso 5 en Tareas 9 y 10.
