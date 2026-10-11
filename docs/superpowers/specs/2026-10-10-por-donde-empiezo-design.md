# Por Dónde Empiezo — Especificación de diseño

**Fecha:** 2026-10-10
**Estado:** aprobado en conversación; pendiente de revisión del documento escrito
**Nombre del producto:** Por Dónde Empiezo
**Frase de entrada:** "No tenés que ordenar todo, solo lo siguiente."

---

## 1. Problema y propósito

Ordenar y limpiar una casa es un trabajo que casi nunca falla por falta de capacidad: falla
por **no saber por dónde empezar**. La persona mira el departamento entero, ve todo junto, se
abruma y no arranca. El costo no es la limpieza en sí, es la decisión previa.

**Por Dónde Empiezo** convierte "tengo que ordenar la casa" en **un solo paso concreto, de dos
minutos, que no requiere decidir nada**. A partir de ahí, encadena los pasos respetando las
dependencias reales del trabajo doméstico (no se trapea antes de barrer) y el tiempo que la
persona tiene disponible en ese momento.

### 1.1 Para quién es

Adultos hispanohablantes (foco inicial: Argentina) a quienes les cuesta arrancar o priorizar
el orden de su casa, por sobrecarga, cansancio, falta de tiempo, TDAH, depresión o simple
desorganización. Incluye a quien limpia todos los días y a quien limpia una vez al mes.

La app **no está dirigida a menores de 18 años**. La función de IA de la fase 2 exige
explícitamente ser mayor de 18, por los términos de uso del proveedor.

### 1.2 Cómo se mide el éxito

- Una persona nueva llega, elige un ambiente y **recibe un plan accionable en menos de un minuto**,
  sin registrarse y sin tutorial.
- La primera tarea del plan es siempre tan chica que no da miedo empezar.
- La persona vuelve después de días o semanas **sin sentir culpa**, y encuentra un plan listo.

### 1.3 Principios de diseño (obligatorios, no aspiracionales)

1. **Un paso por vez.** La pantalla principal muestra una sola tarea. Nunca una lista completa.
2. **Sin culpa.** Ningún número baja por no usar la app. No hay rachas. No hay rojo. No hay
   notificaciones que reclamen.
3. **La decisión es de la app, no del usuario.** Si el usuario tiene que elegir qué hacer,
   la app falló.
4. **Funciona sin cuenta, sin internet y sin IA.** La IA es una mejora opcional, nunca un requisito.
5. **El estado es de la casa, no de la persona.** "La cocina necesita una pasada" es un hecho
   sobre la cocina; no es un juicio sobre vos.

---

## 2. Alcance

### 2.1 Fase 1 — lo que se construye ahora

| # | Capacidad |
|---|---|
| 1 | Uso completo **sin cuenta y sin conexión**. |
| 2 | Catálogo de ambientes con tareas típicas propuestas, editables por el usuario. |
| 3 | Motor de orden con 3 modos y presupuesto de tiempo. |
| 4 | Plan paso a paso: tildar, saltear, reordenar, progreso. |
| 5 | Sesiones: registro, cierre e historial. |
| 6 | Totales acumulados que solo suben. |
| 7 | Logros por esfuerzo, incluido el logro de volver después de una ausencia. |
| 8 | Plano de la casa que se ilumina por ambiente. |
| 9 | Retos contrarreloj ("15 minutos y paramos"). |
| 10 | Cuenta opcional (Google o email + contraseña) solo para sincronizar entre dispositivos. |
| 11 | Instalable como app (PWA) en Android e iOS. |

### 2.2 Fase 2 — después de que la fase 1 funcione

| # | Capacidad |
|---|---|
| 1 | IA opcional con **clave propia del usuario**: texto libre → tareas. |
| 2 | IA opcional con **clave propia del usuario**: foto del ambiente → detección de desorden. |
| 3 | Fotos de antes y después, guardadas solo en el teléfono. |

La IA se activa únicamente si el usuario pega su propia clave de Google AI Studio, y solo
después de aceptar una advertencia explícita de privacidad (sección 9.3).

### 2.3 Fuera de alcance (explícito)

Compartir un plan entre dos personas; notificaciones push; publicación en App Store o Play
Store; más de un hogar por cuenta; funciones sociales, ranking o comparación con otras
personas; funciones de accesibilidad avanzada más allá de lo listado en la sección 8.

---

## 3. Arquitectura

Cuatro módulos, cada uno con una sola responsabilidad y una interfaz clara.

```
src/
  domain/     Motor de orden, tipos y catálogo. Puro: sin React, sin red, sin base de datos.
  data/       Repositorio con dos implementaciones detrás de una misma interfaz.
  ui/         React: pantallas y componentes.
  sync/       Solo con cuenta: subir, bajar y fusionar.
```

### 3.1 `domain/` — el motor, puro

Contiene los tipos, el catálogo de ambientes y tareas, y el ordenador. **No importa nada de
React, de la red ni de la base de datos.** Es una función determinística: la misma entrada
produce siempre el mismo plan. Esto es lo que permite *garantizar* el orden con tests en lugar
de confiar en que funciona.

### 3.2 `data/` — el repositorio, con dos implementaciones

Una sola interfaz `Repositorio` con dos implementaciones intercambiables:

- `RepositorioLocal` — IndexedDB en el teléfono. Es la implementación activa por defecto y la
  única que existe mientras no haya cuenta.
- `RepositorioNube` — Supabase (Postgres + Auth + reglas de acceso por fila).

La interfaz expone operaciones de lectura y escritura del hogar, los ambientes, las tareas, los
planes, las sesiones y los logros. **Ningún componente de UI sabe cuál implementación está
activa.** Esto es lo que hace que "sin cuenta" y "con cuenta" sean el mismo producto y no dos.

### 3.3 `ui/` — React

Las pantallas de la sección 7. Mobile-first. No contiene lógica de orden ni de persistencia.

### 3.4 `sync/` — solo con cuenta

Subida de lo local, bajada de lo remoto y fusión. Reglas en la sección 6.

### 3.5 Por qué no una app nativa ni IA en el navegador

- **Expo / React Native:** descartado. Un solo código para Android, iOS y web suena atractivo,
  pero la versión web de Expo es la más débil de las tres plataformas, el objetivo es el
  navegador móvil, y publicar en tiendas cuesta dinero (Apple, US$99 al año). Sobredimensionado.
- **IA local en el navegador:** descartada para móvil. El modelo integrado de Chrome no está
  disponible en Android ni en iOS, y WebGPU en iOS recién aparece desde iOS 26. No es una base
  confiable hoy.

---

## 4. Modelo de datos

Estos son los sustantivos del producto, y son literalmente el vocabulario de la idea original:
**Hogar → Ambiente → Sub-ambiente → Objeto → Tarea.**

### 4.1 Entidades

**Hogar**
- `id`, `nombre`, `creadoEn`

**Ambiente**
- `id`, `hogarId`, `tipo` (cocina, baño, dormitorio, living, lavadero, balcón, escritorio, garage),
  `nombre` (editable), `ordenRecorrido` (número; define la secuencia lógica de la casa),
  `creadoEn`
- Estado del ciclo actual: `pendiente` | `aMedioCamino` | `alDia`, con `ultimaPuestaAlDia` (fecha o nulo)
- Contador histórico `vecesAlDia` (entero, **solo sube**)

**SubAmbiente**
- `id`, `ambienteId`, `nombre` (ej. "placard", "bajo la mesada", "ventana")

**Objeto**
- `id`, `ambienteId`, `subAmbienteId` (opcional), `nombre` (ej. "hornallas", "mesada", "piso")

**Tarea**
- `id`, `ambienteId`, `subAmbienteId` (opcional), `objetoId` (opcional)
- `verbo`: `ordenar` | `limpiar` | `guardar` | `tirar` | `lavar`
- `descripcion` (ej. "la mesada"), `duracionMin` (entero, minutos)
- `esfuerzo`: 1 | 2 | 3
- `impactoVisual`: 1 | 2 | 3
- `requiere`: `id[]` — otras tareas que deben hacerse antes
- `herramientas`: `string[]` (ej. `["trapo", "balde"]`)
- `esDelCatalogo`: booleano — distingue lo propuesto por la app de lo agregado por el usuario
- `notas` (texto libre, opcional)

**Plan**
- `id`, `hogarId`, `creadoEn`, `modo`, `presupuestoSegundos` (o nulo = sin límite)
- `pasos`: lista ordenada de `{ tareaId, estado: pendiente|hecho|salteado, hechoEn }`
- `cerradoEn` (fecha o nulo)

**Sesión**
- `id`, `hogarId`, `planId`, `iniciadaEn`, `cerradaEn`
- `duracionRealSegundos` (tiempo de reloj entre inicio y cierre)
- `pasosHechos`, `pasosSalteados`, `tareasHechasPorAmbiente`
- `modo`, `presupuestoCumplido` (booleano: verdadero si se completaron **todos** los pasos del plan)
- `fueContrarreloj` (booleano)

**Logro**
- `id` (clave del catálogo de logros), `hogarId`, `desbloqueadoEn`

**Perfil / Preferencias**
- `herramientasDisponibles: string[]` (por defecto: escoba, trapo, balde, detergente)
- `modoPorDefecto`, `duracionRetoPreferida`

### 4.2 Reglas de estado del ambiente

Un **ciclo** de un ambiente empieza cuando el usuario decide ponerse con ese ambiente y termina
cuando todas sus tareas quedan hechas. El estado que se ve es siempre el del ciclo actual.

- Un ambiente está `alDia` cuando **todas** sus tareas están en estado `hecho` en el ciclo actual.
  Al llegar a ese estado se actualiza `ultimaPuestaAlDia` y se incrementa `vecesAlDia`.
- Un ambiente está `aMedioCamino` si tiene al menos una tarea hecha y al menos una pendiente.
- Un ambiente está `pendiente` si no tiene ninguna tarea hecha en el ciclo actual.
- **El estado nunca empeora por el paso del tiempo.** No hay decaimiento automático. Solo cambia
  cuando el usuario hace o deshace algo.
- La app muestra siempre, junto al estado, el dato neutro `ultimaPuestaAlDia` en texto gris
  ("puesta a punto: hace 12 días"). Es información, no un reclamo.
- Cuando el usuario incluye un ambiente en una sesión nueva, las tareas que ya estaban `hecho`
  **permanecen hechas**. Un ciclo nuevo se abre únicamente con la acción explícita **"Arrancar de
  nuevo este ambiente"**, disponible en la pantalla de detalle del ambiente (sección 7, pantalla 6),
  y siempre con confirmación. Esa acción marca todas las tareas del ambiente como pendientes y
  abre un ciclo nuevo; **no** toca `vecesAlDia`, ni `ultimaPuestaAlDia`, ni ningún total.
  `vecesAlDia` nunca se decrementa.

Así, el plano no se queda verde para siempre, y el único que puede "bajar" un estado es el propio
usuario, a propósito.

---

## 5. Motor de orden

### 5.1 Entrada

`generarPlan(entrada)` recibe: el hogar con sus ambientes y tareas (con las tildadas por el
usuario), el **modo**, el **presupuesto en minutos** (o nulo), las **herramientas disponibles**,
y el **historial reciente** (qué se hizo en la última sesión).

Devuelve un `Plan` con los pasos ordenados y la meta de la sesión.

### 5.2 Los siete pasos del algoritmo

El algoritmo se ejecuta siempre en este orden. Los pasos 3 y 4 existen para que la garantía G2
(el arranque de dos minutos) sea una **restricción dura** y no un resultado afortunado del puntaje.

1. **Filtrar.** Se descartan las tareas no incluidas por el usuario y las que requieren
   herramientas que el usuario declaró no tener.
2. **Construir el grafo.** Cada tarea aporta aristas hacia sus dependientes. Si se detecta un
   ciclo, se rompe por duración (se elimina la arista de la tarea más larga) y **se reporta**;
   nunca falla en silencio.
3. **Elegir el ambiente de arranque**, según el modo:
   - `arrancarYa` y `ambientePorAmbiente`: el ambiente con **más tareas pendientes** entre las
     seleccionadas. Empate: el de `ultimaPuestaAlDia` más antigua; si nunca se puso al día, ese.
   - `puestaAPunto`: el primer ambiente del recorrido (`ordenRecorrido` ascendente) que tenga
     tareas seleccionadas.
4. **Elegir el paso de arranque.** Dentro del ambiente elegido y entre las tareas sin dependencias
   pendientes, la de mayor puntaje (paso 5) **con duración ≤ 2 minutos**. Si ese ambiente no
   tuviera ninguna tarea de ≤ 2 minutos, se toma la más corta y el plan registra una advertencia
   interna. Ese caso no debería ocurrir nunca, porque la sección 5.4 obliga a que cada ambiente
   tenga al menos una tarea de 2 minutos sin dependencias.
5. **Ordenar el resto.** Con el paso de arranque fijado en primer lugar, se ordena el resto por
   orden topológico, desempatando por puntaje. La función de puntaje es explícita:

   ```
   puntaje(t) = wVisual       * t.impactoVisual
              + wVelocidad    * (1 / max(1, t.duracionMin))
              + wContinuidad  * (t.ambienteId == pasoAnterior.ambienteId ? 1 : 0)
              + wHerramientas * (t.herramientas ⊆ herramientasEnMano ? 1 : 0)
   ```

   `herramientasEnMano` son las herramientas que exige el paso inmediatamente anterior de la
   secuencia que se está construyendo (al inicio, las del paso de arranque). Sirve para no hacerte
   ir a buscar el balde dos veces.

   Pesos por modo:

   | Modo | wVisual | wVelocidad | wContinuidad | wHerramientas |
   |---|---|---|---|---|
   | `arrancarYa` | 3 | 2 | 1 | 1 |
   | `ambientePorAmbiente` | 1 | 1 | 5 | 1 |
   | `puestaAPunto` | 2 | 1 | 2 | 1 |

   En `puestaAPunto`, además, el orden base **no** lo define el puntaje sino el recorrido: los
   ambientes se ordenan por `ordenRecorrido` ascendente, y dentro de cada ambiente el orden es
   arriba → abajo, seco antes que húmedo, `guardar` antes que `limpiar` antes que `tirar`. El
   puntaje solo desempata dentro de esas reglas.

6. **Recortar al presupuesto.** Se recorre la secuencia y se agregan pasos mientras la suma de
   duraciones no supere el presupuesto. Si un paso no entra, **sus dependientes tampoco entran**.
   Si quedaron pasos afuera, el plan reporta cuántos minutos reales faltan para terminarlo.

7. **Devolver el plan** junto con la meta de la sesión (cuántos pasos y cuántos minutos se propuso).

### 5.3 Garantías verificables (invariantes)

Cada una se verifica con al menos un test automático.

| # | Garantía |
|---|---|
| G1 | Ninguna tarea aparece antes que alguna de sus dependencias. |
| G2 | El primer paso dura **≤ 2 minutos**, no tiene dependencias sin resolver, y pertenece al ambiente de arranque definido en el paso 3 (el más desordenado, o el primero del recorrido en `puestaAPunto`). |
| G3 | Nunca aparece una tarea de `limpiar` húmedo (trapear, lavar pisos) antes de la de barrer el mismo piso. Se garantiza por las aristas del catálogo, y hay un test que lo comprueba específicamente. |
| G4 | El plan nunca supera el presupuesto elegido, salvo que el usuario pida explícitamente seguir. |
| G5 | Determinismo: la misma entrada produce exactamente el mismo plan. |
| G6 | Si el presupuesto es tan chico que no entra ninguna tarea útil, el plan lo informa explícitamente en lugar de devolver una lista vacía. |

### 5.4 Catálogo

El catálogo de ambientes, sub-ambientes, objetos y tareas típicas **vive dentro de la app**, como
datos versionados en el repositorio. No vive en la base de datos. Razón: es lo que permite que la
app sirva desde el primer segundo, sin conexión y sin cuenta. Se mejora publicando una versión nueva.

El catálogo arranca con estos ocho ambientes: **cocina, baño, dormitorio, living, lavadero, balcón,
escritorio, garage.**

Obligaciones de integridad del catálogo, verificadas por tests:
- Toda referencia en `requiere` apunta a una tarea existente.
- El grafo del catálogo no tiene ciclos.
- Toda tarea tiene `duracionMin > 0`, un `verbo` válido y `esfuerzo`/`impactoVisual` en 1..3.
- Existe al menos una tarea de ≤ 2 minutos sin dependencias **en cada ambiente**, para que G2
  se pueda cumplir siempre.
- Se respetan estas tres reglas de dependencia, que son las que hacen que el orden "tenga sentido"
  para una persona y que G3 se pueda verificar:
  1. **Seco antes que húmedo:** barrer o aspirar un piso siempre precede a trapearlo o lavarlo.
  2. **Arriba antes que abajo:** limpiar una superficie elevada (estante, mesada, hornallas)
     precede a limpiar el piso de ese ambiente.
  3. **Sacar antes que limpiar:** retirar platos, ropa o cosas del medio precede a limpiar la
     superficie que ocupaban.

---

## 6. Persistencia, cuentas y sincronización

### 6.1 Sin cuenta (comportamiento por defecto)

Todo se guarda en IndexedDB, en el teléfono. La app funciona completa sin conexión, incluido el
motor de orden, el historial y los logros.

### 6.2 Crear cuenta

La cuenta se ofrece **solo** con este motivo: *"Para no perder nada si cambiás de teléfono."*
Nunca se pide cuenta para usar una función.

Al crear la cuenta se ofrece migrar los datos locales a la nube. La migración es explícita y
reversible: si falla, los datos locales no se tocan.

**Métodos de acceso:** Google OAuth y email + contraseña.
**Descartado:** enlaces mágicos por email. El servicio de correo gratuito de Supabase permite
2 envíos por hora, lo que rompe el registro con pocos usuarios.

### 6.3 Fusión de datos

Cuando el usuario entra en un dispositivo con datos locales y también hay datos en la nube:

- Los **pasos hechos** se fusionan por unión: si un paso está hecho en cualquiera de los dos
  lados, queda hecho. Se conserva la fecha más antigua.
- Los **totales y los logros** se fusionan por unión. `vecesAlDia` toma el mayor de los dos.
- Si las **estructuras** de plan difieren (distinta lista de tareas), **no se elige
  automáticamente**: la app le muestra las dos versiones al usuario y le pide cuál conservar.
- **Nunca se borra nada en silencio.**

### 6.4 Aislamiento entre usuarios

Cada fila de la base lleva el identificador de su dueño y las **reglas de acceso por fila**
(Row Level Security) de Postgres garantizan el aislamiento. El aislamiento es una propiedad de
la base de datos, no del código de la aplicación.

### 6.5 Alojamiento

- Frontend: sitio estático (Cloudflare Pages o Vercel, plan gratuito).
- Backend: Supabase, plan gratuito (Postgres + Auth + reglas por fila).
- **Mitigación obligatoria:** el plan gratuito de Supabase pausa el proyecto tras una semana sin
  uso, lo que es incompatible con una app de uso esporádico. Se agrega una tarea programada
  (GitHub Actions) que hace una consulta trivial a la base cada dos días. Sin esta mitigación,
  la fase 1 no se considera terminada.

---

## 7. Pantallas

Mobile-first, pensado para una mano y el pulgar. Botones de 44 px de alto como mínimo, texto
grande, alto contraste, modo oscuro, y nada que dependa de pasar el mouse por encima.

1. **Primera vez.** *"¿Qué querés ordenar?"* y chips de ambientes. Sin registro, sin tutorial,
   sin carrusel de bienvenida.
2. **Armado del ambiente.** *"Esto es lo que solemos hacer en la Cocina"*, agrupado por objeto,
   con lo esencial ya tildado, y *"+ agregar algo mío"*. Editable en cualquier momento.
3. **Arranque de sesión.** *"¿Cuánto tiempo tenés?"* con opciones 10 / 20 / 30 / 60 / sin límite,
   y el modo (con *Arrancar ya* preseleccionado y explicado en una línea). Un único botón:
   **"Armá el plan"**.
4. **El plan (pantalla central).** Una sola tarjeta grande con **el paso actual**: el verbo en
   grande ("Trapeá"), el objeto, el ambiente y los minutos. Un botón gigante: **"Listo"**.
   Acciones secundarias discretas: *Saltear*, *No puedo ahora*, *Reordenar*. Arriba, la barra de
   progreso; y en modo contrarreloj, el temporizador. Debajo, colapsado, lo que viene.
5. **Cierre de sesión.** *"Terminaste lo que te propusiste"* o *"Se acabó el tiempo: hiciste 7 de 12."*
   Logros desbloqueados y el plano actualizado. Dos botones: *Seguir un rato más* / *Listo por hoy*.
6. **La casa.** El plano simple con los ambientes iluminados según su estado. Un toque abre el
   detalle de cada ambiente, con sus totales históricos y la acción **"Arrancar de nuevo este
   ambiente"** (sección 4.2), que abre un ciclo nuevo siempre con confirmación.
7. **Historial.** La lista de sesiones, con fecha relativa ("hace 12 días"), duración real, qué
   ambientes se tocaron y cuántos pasos. **Sin calendario con huecos.**
8. **Volver después de una ausencia.** Después de 14 días o más sin abrir la app, la pantalla
   inicial dice *"Hace 23 días. ¿Arrancamos con 10 minutos?"* con el plan de 10 minutos ya armado.
   Sin reproches y sin resumen de lo que no se hizo.
9. **Ajustes.** Cuenta (opcional), herramientas disponibles, modo por defecto, duración de los
   retos, borrar todos los datos, y el aviso de IA de la fase 2.

---

## 8. Accesibilidad y rendimiento

- Área táctil mínima de 44 × 44 px.
- Contraste de texto según WCAG AA.
- La información nunca se transmite **solo** por color: cada estado del plano lleva también su
  nombre en texto.
- Compatible con lectores de pantalla: etiquetas accesibles en todos los controles y anuncio del
  paso actual al cambiar.
- La pantalla del plan no tiene scroll horizontal ni requiere zoom.
- Carga inicial en menos de 3 segundos en una conexión 3G, y funciona sin conexión una vez
  instalada.
- Respeta la preferencia del sistema de movimiento reducido.

---

## 9. Privacidad

### 9.1 Fase 1

Los datos de la casa no salen del teléfono salvo que el usuario cree una cuenta. No hay
analítica de terceros ni rastreadores.

### 9.2 Con cuenta

Los datos se guardan en Supabase, aislados por usuario mediante reglas de acceso por fila. El
usuario puede borrar todos sus datos desde Ajustes, y el borrado elimina también la copia en la
nube.

### 9.3 Fase 2 — advertencia obligatoria de IA

Antes de activar cualquier función de IA, y antes de permitir enviar una foto, la app muestra y
exige aceptar este contenido, en estos términos:

> **Antes de usar la IA, leé esto.**
> Vas a usar tu propia clave de Google. Lo que le mandes —textos y **fotos de tu casa**— viaja a
> los servidores de Google. En el plan gratuito, Google puede usar ese contenido para mejorar sus
> productos **y personas revisoras pueden leerlo**. No mandes fotos donde aparezcan documentos,
> pantallas, personas ni nada que no quieras compartir.
> Tu clave se guarda **solo en este teléfono** y nunca pasa por nuestros servidores.
> Podés usar la app completa sin activar esto.

---

## 10. Stack técnico

| Capa | Elección |
|---|---|
| Lenguaje | TypeScript |
| UI | React + Vite |
| Estilos | Tailwind CSS |
| Ruteo | React Router |
| Estado | Zustand |
| Persistencia local | IndexedDB mediante Dexie |
| Nube y cuentas | Supabase (`@supabase/supabase-js`) |
| PWA | `vite-plugin-pwa` (manifest + service worker) |
| Tests | Vitest |
| Alojamiento | Cloudflare Pages o Vercel (estático, plan gratuito) |

Todo el stack es gratuito y no requiere tarjeta de crédito.

---

## 11. Estrategia de pruebas

### 11.1 Tests automáticos (Vitest)

**Motor de orden** — un test por cada invariante G1 a G6, más:
- Cada uno de los tres modos produce un orden distinto y coherente con su tabla de pesos.
- Presupuestos de 0, 5, 10, 20, 60 minutos y sin límite.
- Casos borde: sin tareas tildadas; una sola tarea; una tarea de 30 minutos con presupuesto de
  10 (debe informar que no entra, según G6); un ciclo introducido a propósito (debe romperse y
  reportarse).
- Determinismo: se ejecuta el mismo caso 100 veces y se compara el resultado.

**Catálogo** — valida las cuatro obligaciones de integridad de la sección 5.4.

**Repositorio** — guardar, leer, actualizar y borrar en la implementación local; migración de
datos locales a la nube y fusión según las reglas de la sección 6.3.

### 11.2 Verificación manual, en dispositivo

Cada entregable se verifica en un navegador móvil real (Chrome en Android y Safari en iOS) antes
de darse por terminado:
- Ancho de 360 px sin scroll horizontal.
- Todas las áreas táctiles de 44 px o más.
- La app se instala y arranca sin conexión.
- El paso actual se lee de un vistazo, con el pulgar, sin zoom.

---

## 12. Entregables verticales

Cada entregable es usable por sí solo. No se avanza al siguiente hasta que el anterior funcione
en un teléfono real.

1. **El motor y el plan.** Catálogo inicial, motor de orden, armado del ambiente, arranque de
   sesión y pantalla del plan. Sin cuentas, sin historial. Al terminar, ya sirve para su propósito
   principal: decirte por dónde empezar.
2. **Sesiones e historial.** Cierre de sesión, registro, totales acumulados y pantalla de historial.
3. **La casa y los logros.** Plano que se ilumina, estados por ambiente, catálogo de logros,
   incluido *"Volviste"*, y la pantalla de regreso después de una ausencia.
4. **Retos contrarreloj.** Temporizador, duración configurable y celebración al llegar a cero.
5. **Cuenta y sincronización.** Google y email + contraseña, migración de lo local, fusión, y la
   tarea programada que evita la pausa del plan gratuito.

---

## 13. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| El motor produce un orden que "no tiene sentido" para el usuario. | Las garantías G1–G6 están cubiertas por tests, y el botón *Reordenar* permite corregirlo en el momento sin entender por qué. |
| El catálogo inicial no refleja cómo limpia la gente real. | Todo es editable, y el test de integridad garantiza que cada ambiente tenga al menos un paso de 2 minutos. |
| La pausa del plan gratuito de Supabase rompe la sincronización. | Tarea programada cada dos días, obligatoria antes de dar por terminado el entregable 5 (secciones 6.5 y 12). |
| El proveedor gratuito de IA cambia sus condiciones o sus límites. | La IA es opcional y con clave del usuario: si cambia, la app sigue funcionando completa sin ella. |
| Fricción de registro. | La cuenta es opcional y se pide solo para sincronizar; nunca para usar una función. |
| La gamificación se convierte en presión. | Principio 2 de la sección 1.3: ningún número baja por no usar la app. Nada en rojo. Ninguna racha. |
| Alcance grande para una fase 1. | Cinco entregables verticales, cada uno usable por sí solo. |

---

## 14. Decisiones tomadas por delegación

El usuario delegó explícitamente el criterio de orden ("prefiero confiar en tu criterio"). Se
resolvió **no elegir por él**: los tres criterios legítimos conviven como tres modos sobre un
mismo motor, con *Arrancar ya* preseleccionado. Registrado acá para que quede claro que no es
una decisión del usuario.

---

## 15. Historial de revisiones

| Fecha | Cambio |
|---|---|
| 2026-10-10 | Versión inicial aprobada en conversación. |
