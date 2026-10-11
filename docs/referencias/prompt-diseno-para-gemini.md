# Prompt de diseño para Gemini

Brief listo para pegar en Gemini (Canvas, Stitch o AI Studio). Sirve para pedir un diseño que
respete el plan visual aprobado en `docs/superpowers/specs/2026-10-10-por-donde-empiezo-plan-visual.md`.

Después de generarlo, guardá el resultado en `docs/referencias/stitch/`.

---

## El prompt

Actuá como diseñador de producto y desarrollador front-end. Diseñá las pantallas de una app web
mobile-first llamada **Por dónde empiezo**.

### Qué es la app

Ayuda a decidir por dónde empezar a ordenar y limpiar una casa. La persona elige sus ambientes,
tilda lo que hay que hacer, dice cuánto tiempo tiene, y la app le devuelve un plan paso a paso, que
arranca con una tarea de dos minutos. El problema que resuelve no es limpiar: es no saber por dónde
arrancar.

### Quién la usa y en qué situación

Un adulto, de pie en un ambiente desordenado, con el celular en una mano, cansado, con poca energía
y muchas veces de noche. La interfaz no puede sumar carga: tiene que **bajar** la activación.

### Identidad visual: ya está decidida, no la cambies

Dirección: **«Luz de velador»**. El cuarto está a oscuras y la app es la única luz encendida. Solo
el paso actual brilla; todo lo demás se retira hacia la oscuridad. La oscuridad no es un tema oscuro
más: representa no estar abrumado.

Usá EXACTAMENTE estos tokens, con estos nombres, en `:root`:

```css
--color-noche: #171633;      /* fondo base */
--color-pared: #232246;      /* superficie de la tarjeta */
--color-hueso: #F1EEF9;      /* texto principal */
--color-humo: #A8A4C6;       /* texto secundario y acciones discretas */
--color-velador: #F2B455;    /* LA LUZ: paso actual, progreso, foco */
--color-menta: #7FC8AE;      /* lo que ya está hecho */
--color-borde: color-mix(in oklab, var(--color-hueso) 12%, transparent);
```

Tipografías, las dos de Google Fonts y de código abierto:

- **Instrument Sans** — interfaz, cuerpo, botones, números.
- **Bricolage Grotesque**, peso 600 — solo el verbo del paso actual y el nombre de la app.

Escala tipográfica: paso `clamp(2.5rem, 13vw, 4.5rem)` · título `1.75rem` · botón `1.25rem` ·
cuerpo `17px` · menudo `15px`.
Radios: 20px la tarjeta, 14px los controles. Sombra de la tarjeta, en dos capas:
`0 1px 2px rgb(0 0 0 / .35), 0 12px 32px -12px rgb(9 8 24 / .85)`.

Reglas de uso del color, obligatorias:

- El ámbar es **escaso**: en la pantalla del plan aparece solo en la barra de progreso y en el botón
  «Listo».
- **No existe el rojo.** Ninguna advertencia, ningún error y ninguna acción secundaria usa rojo.
- Nada se comunica solo por color.
- Un solo modo: oscuro.

### El elemento memorable

Una sola audacia: **la lámpara**. Un resplandor ámbar muy tenue detrás de la tarjeta del paso, en el
centro de la pantalla. Es el único adorno de toda la app. Al tocar «Listo», la luz viaja a la
posición del paso siguiente en 240 ms, animando solo `transform` y `opacity`. Con
`prefers-reduced-motion: reduce` aparece directamente en el paso nuevo. **Nada más se anima**: ni
entradas por sección, ni efectos al pasar por encima, ni rebotes.

### Layout

Una sola columna, ancho máximo 480 px centrado, pensado para 360 a 430 px de ancho. Todo lo que se
toca vive en el tercio inferior, al alcance del pulgar. Respetá las safe areas con
`env(safe-area-inset-*)`: el botón «Listo» nunca puede quedar debajo de la barra de gestos. El centro
de la pantalla del plan queda **vacío a propósito**: es el cuarto.

Cada pantalla va dentro de un marco de 390 × 844 px, y las cinco se ven una debajo de la otra sin
tener que hacer clic en nada.

### Las cinco pantallas

1. **«¿Qué querés ordenar?»** — el nombre de la app en Bricolage, la pregunta en tamaño título, y
   los ocho ambientes como fichas en dos columnas de 56 px de alto: Cocina, Baño, Dormitorio, Living,
   Lavadero, Balcón, Escritorio, Garage. Las elegidas se encienden con borde ámbar y una marca de
   menta. Abajo, el botón «Armá las tareas», deshabilitado hasta que haya al menos una elegida, con
   la explicación en texto menudo justo encima: «Elegí al menos un ambiente».

2. **Armado del ambiente** — la lista de tareas agrupada por el nombre del objeto («Mesada»,
   «Hornallas», «Piso»), el nombre del objeto en tamaño título y sus tareas debajo. Cada tarea:
   casilla, descripción y duración («6 min»). La casilla y su etiqueta comparten un solo blanco de
   toque de 56 px. Al final, un campo de texto con su etiqueta y un botón «Agregar». Incluí una tarea
   propia con un nombre largo, para que se vea cómo se recorta a dos líneas sin romper el layout.

3. **«¿Cuánto tiempo tenés?»** — cuatro fichas grandes: 10, 20, 30 y 60 minutos, más una quinta,
   «Sin límite». Debajo, los tres modos como fichas apiladas, cada una con su nombre y una línea de
   explicación en texto menudo: «Arrancar ya» (preseleccionada), «Ambiente por ambiente» y «Puesta a
   punto». Un único botón: «Armá el plan».

4. **El plan** — la pantalla central. Arriba, solo la barra de progreso de 2 px en ámbar y el
   contador «3 de 9» con números tabulares. El medio vacío, con el resplandor. Abajo, la tarjeta: el
   verbo en enorme («Trapeá»), después el objeto («el piso»), después «Cocina · 6 min» con espacio
   duro, y «Vas a necesitar trapo». Debajo, el botón «Listo» a ancho completo y 76 px de alto, en
   ámbar con texto noche. Y más abajo, discretas y de 44 px: «Saltear», «No puedo ahora» y
   «Reordenar». Mostrá además el estado sin tiempo suficiente: «No te alcanza el tiempo para nada
   útil. Necesitás al menos 12 minutos», con un botón «Ver el plan completo».

5. **Cierre de sesión** — «Terminaste lo que te propusiste» o «Se acabó el tiempo: hiciste 7 de 12»,
   y dos botones: «Seguir un rato más» y «Listo por hoy».

### Idioma y redacción

Español rioplatense con voseo: «tenés», «elegí», «armá», «trapeá». **Frase de caso oración en todo**,
incluidos títulos y botones: nada de Título En Mayúsculas. Comillas «» o “ ”, y el carácter `…` en
vez de `...`. Los botones dicen exactamente lo que pasa. Sin texto de relleno ni lorem ipsum: usá
contenido real, como el de los ejemplos.

### Accesibilidad y comportamiento, obligatorio

- Área táctil mínima de 44 × 44 px, incluidas las acciones secundarias.
- Toda entrada de texto con `font-size` ≥ 16 px. **Nunca** deshabilites el zoom del navegador: nada
  de `maximum-scale` ni `user-scalable=no`.
- Anillo de foco visible con `:focus-visible`: `outline: 2px solid var(--color-velador)`.
- `touch-action: manipulation` y `-webkit-tap-highlight-color` acorde al diseño.
- `color-scheme: dark` en `<html>` y `<meta name="theme-color" content="#171633">`.
- `font-variant-numeric: tabular-nums` en el contador y en los minutos.
- `text-wrap: balance` en los títulos.
- **Prohibido** `transition: all`: listá siempre las propiedades que animás.
- Contraste mínimo WCAG 2.2 AA. Estos pares ya están medidos y cumplen: hueso sobre noche 15.3:1,
  humo sobre pared 6.3:1, noche sobre velador 9.5:1.

### Qué NO hacer

- Nada de Material Design: ni *elevation*, ni *ripple*, ni FAB, ni *app bar*, ni fichas con forma de
  píldora.
- Nada de tarjetas idénticas repetidas, con el mismo radio y la misma sombra gris.
- Nada de etiquetas en mayúsculas espaciadas arriba de los títulos, ni tipografía monoespaciada para
  datos, ni flechas «→» al final de los botones.
- Nada de gradientes decorativos, ilustraciones, íconos decorativos ni emoji.
- Nada de pantallas fuera de la lista: no hay registro, ni inicio de sesión, ni panel de
  estadísticas, ni ajustes.

### Entregable

**Un solo archivo HTML** autocontenido, con el CSS dentro de un `<style>`, sin frameworks ni
dependencias externas más allá de las dos tipografías de Google Fonts. Los tokens exactos de arriba,
en `:root`. Las cinco pantallas, cada una en un marco de 390 × 844 px, una debajo de la otra. Al
principio del archivo, un comentario con las decisiones que tomaste y con cualquier punto donde te
hayas desviado de este brief.
