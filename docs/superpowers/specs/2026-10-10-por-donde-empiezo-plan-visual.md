# Plan visual — Por Dónde Empiezo

**Fecha:** 2026-10-10
**Estado:** aprobado por el usuario
**Dirección elegida:** A — *Luz de velador*, entre tres propuestas presentadas (las otras dos eran *Instrucción*, letra enorme y cero decoración, y *Pizarrón*, la tilde que queda al completar)

Este documento es el paso 1 del entregable 1 y la sección 13.3 de la especificación lo exige
**antes** de escribir el primer componente visual.

---

## 1. La idea

**El cuarto está a oscuras y la app es la única luz encendida.**

No es una metáfora decorativa: es la promesa del producto escrita en la pantalla. La app nunca
muestra el desorden completo. Muestra **una sola cosa iluminada** y deja todo lo demás en penumbra.
La oscuridad no es un tema oscuro más: es la representación visual de no estar abrumado.

De ahí salen las tres reglas que gobiernan todo lo demás:

1. **Solo el paso actual tiene luz.** El acento ámbar no se usa para decorar; se usa para señalar
   dónde hay que mirar ahora.
2. **La luz nunca se apaga del todo.** El progreso son marcas de menta que quedan atrás: lo hecho
   se acumula y no se borra. Es el principio «ningún indicador baja» hecho píxeles.
3. **El espacio vacío del medio es el cuarto.** No se rellena con tarjetas, ni con estadísticas, ni
   con adornos. Se usa para que la tarea respire.

---

## 2. Paleta

Seis colores con nombre. Ninguno es `#000000` ni `#0B0B0B`: el fondo es un índigo con violeta, con
materia, no un negro tintado.

| Token | Valor | Rol |
|---|---|---|
| `--color-noche` | `#171633` | Fondo base. El cuarto a oscuras. |
| `--color-pared` | `#232246` | Superficie elevada: la tarjeta del paso, las hojas. |
| `--color-hueso` | `#F1EEF9` | Texto principal. |
| `--color-humo` | `#A8A4C6` | Texto secundario, metadatos, acciones discretas. |
| `--color-velador` | `#F2B455` | **La luz.** Paso actual, progreso, foco. Acento principal. |
| `--color-menta` | `#7FC8AE` | Confirmación: lo que ya está hecho. Acento secundario. |

El borde de la tarjeta **no** es un séptimo color: se deriva con
`color-mix(in oklab, var(--color-hueso) 12%, transparent)`.

### Reglas de uso del color

- **El ámbar es escaso.** En la pantalla del plan aparece en exactamente dos lugares: la línea de
  progreso y el botón «Listo». Si aparece un tercero, sobra.
- **No existe el rojo.** Ninguna acción secundaria, ninguna advertencia, ningún estado usa rojo.
  *Saltear* y *No puedo ahora* van en `--color-humo`. La ausencia no es un error y no se pinta como
  tal. Es el principio 2 de la especificación aplicado al color.
- **Nada comunica solo por color.** Los estados del plano y los logros llevan siempre su nombre en
  texto, además del color.
- **Un solo modo.** Oscuro, con `color-scheme: dark`. No hay variante clara en el entregable 1.

---

## 3. Tipografía

Dos familias, con roles que no se pisan.

| Rol | Familia | Detalle |
|---|---|---|
| Interfaz | **Instrument Sans** | Cuerpo, etiquetas, botones, números. Humanista, altura de x alta, excelente en pantalla chica. Pesos 400, 500 y 600. |
| El verbo del paso | **Bricolage Grotesque** | Solo el verbo del paso actual y el nombre de la app. Peso 600, con el eje `wonk` apenas activado. Es la voz de la app: cálida, un poco irregular, nunca institucional. |

Las dos son de código abierto (SIL OFL) y variables, así que se les puede recortar el juego de
caracteres a los que realmente se usan y bajar bastante el peso.

### Escala

| Token | Tamaño | Uso |
|---|---|---|
| `--texto-paso` | `clamp(2.5rem, 13vw, 4.5rem)` | El verbo del paso actual, en Bricolage 600 |
| `--texto-titulo` | `1.75rem` | Títulos de pantalla, en Bricolage 600 |
| `--texto-boton` | `1.25rem` / Instrument 600 | Etiquetas de botón |
| `--texto-cuerpo` | `1.0625rem` (17&nbsp;px) | Texto corriente |
| `--texto-menudo` | `0.9375rem` (15&nbsp;px) | Metadatos: minutos, ambiente, herramientas |

### Reglas tipográficas

- **Caso oración en todo**, incluidos botones y títulos. Sin excepciones.
- **Sin etiquetas en mayúsculas** arriba de los títulos. Es uno de los clichés que este diseño evita.
- **Nada de itálicas** para acentuar palabras sueltas.
- Los números que cambian —el temporizador, el contador de progreso— llevan
  `font-variant-numeric: tabular-nums`, o bailan.
- `text-wrap: balance` en títulos para evitar viudas y huérfanas.
- **Las fuentes se sirven desde el propio sitio**, nunca desde un CDN de terceros: es una PWA que
  tiene que funcionar sin conexión, y la especificación prohíbe rastreadores de terceros. Se
  precargan con `font-display: swap`.

---

## 4. Layout

Mobile-first, una sola columna, ancho máximo de 480&nbsp;px centrado en pantallas grandes. Todo lo
que se toca vive en el tercio inferior, al alcance del pulgar, respetando las safe areas del notch y
de la barra de gestos.

### La pantalla del plan, que es la central

```
┌─────────────────────────────┐
│ ▓▓▓▓▓▓▓▓░░░░░░░░░░  3 de 9  │  ← progreso: ámbar sobre noche, 2px
│                             │
│                             │
│            ·  ·             │  ← la lámpara: resplandor ámbar muy tenue
│          ·      ·           │     detrás de la tarjeta. Es el único adorno
│         ·        ·          │     de toda la app.
│                             │
│  ┌───────────────────────┐  │
│  │ Trapeá                │  │  ← --texto-paso, Bricolage 600, hueso
│  │ el piso               │  │  ← --texto-titulo, humo
│  │ Cocina · 6 min        │  │  ← --texto-menudo, humo, espacio duro
│  │ Vas a necesitar trapo │  │
│  └───────────────────────┘  │  ← --color-pared, radio 20px
│                             │
│  ┌───────────────────────┐  │
│  │        Listo          │  │  ← 76px de alto, velador sobre noche
│  └───────────────────────┘  │
│                             │
│   Saltear   No puedo ahora  │  ← discretas, humo, 44px de alto
│                             │
└─────────────────────────────┘
   ^ padding inferior = env(safe-area-inset-bottom)
```

- **Arriba:** solo la línea de progreso y el contador. Nada más.
- **El medio:** vacío, a propósito. Es el cuarto.
- **La tarjeta del paso:** un solo `<article>`. El verbo primero y en grande, después el objeto, y
  al final los metadatos en `--texto-menudo`.
- **Abajo:** el botón «Listo» a ancho completo, y debajo las acciones secundarias. **Una sola cosa
  luminosa para tocar.**

### Las otras tres pantallas

**¿Qué querés ordenar?** El nombre de la app en Bricolage, la pregunta en `--texto-titulo`, y los
ocho ambientes como fichas seleccionables en dos columnas, cada una de 56&nbsp;px de alto. Las
elegidas se encienden con un borde ámbar y una marca de menta; las demás quedan en `--color-pared`.
Abajo, el botón «Armá las tareas», deshabilitado hasta que haya al menos una elegida, con la
explicación en `--texto-menudo` justo encima.

**Armado del ambiente.** Una lista agrupada por objeto, con el nombre del objeto en `--texto-titulo`
y sus tareas debajo, cada una con su casilla y su duración. La casilla y su etiqueta comparten un
único blanco de toque de 56&nbsp;px, sin zonas muertas. Al final, el campo para agregar algo propio
y su botón. Los nombres largos se truncan a dos líneas con el texto completo accesible.

**¿Cuánto tiempo tenés?** El tiempo como cuatro fichas grandes (10, 20, 30, 60) y una quinta para
«sin límite», en una sola fila que se envuelve. Debajo, los tres modos como fichas apiladas, cada
una con su nombre y una línea de explicación en `--texto-menudo`. *Arrancar ya* viene encendida.
Al final, un único botón: **«Armá el plan»**.

---

## 5. El elemento memorable: la lámpara

La única audacia del diseño, y está en un solo lugar.

Cuando la persona toca «Listo», **la luz no se reemplaza: se mueve.** El resplandor ámbar detrás de
la tarjeta viaja de la posición del paso que acaba de completar a la del siguiente, y el paso nuevo
entra con un fundido corto. La tarjeta no parpadea ni se reconstruye: se siente como correr el
velador de un lado al otro del cuarto.

| Aspecto | Decisión |
|---|---|
| Duración | 240&nbsp;ms |
| Propiedades | Solo `transform` y `opacity`. Nunca `width`, `height`, `top` ni `left`. |
| Interrupción | Si la persona vuelve a tocar antes de que termine, la animación se corta y salta al estado final. Nunca bloquea. |
| Movimiento reducido | Con `prefers-reduced-motion: reduce` no hay viaje: la luz aparece directamente en el paso nuevo. |
| Lo que deja atrás | Una marca de menta en la línea de progreso, que **no se borra**. |

Nada más se anima. No hay transiciones de entrada por sección, ni efectos al pasar por encima, ni
rebotes. Un solo momento orquestado.

---

## 6. Contraste verificado

Medido, no estimado, con el script de verificación de la tarea. WCAG 2.2 AA: 4.5:1 para texto
normal, 3:1 para elementos no textuales.

| Par | Relación | Mínimo | Resultado | Dónde |
|---|---|---|---|---|
| hueso / noche | 15.29:1 | 4.5 | PASA | Texto principal sobre el fondo base |
| hueso / pared | 13.20:1 | 4.5 | PASA | Texto de la tarjeta del paso |
| humo / noche | 7.33:1 | 4.5 | PASA | Texto secundario sobre el fondo base |
| humo / pared | 6.33:1 | 4.5 | PASA | Metadatos de la tarjeta (minutos, ambiente) |
| velador / noche | 9.54:1 | 4.5 | PASA | Progreso y acento sobre el fondo base |
| velador / pared | 8.23:1 | 4.5 | PASA | Acento sobre la tarjeta |
| noche / velador | 9.54:1 | 4.5 | PASA | Texto del botón «Listo» |
| noche / menta | 8.99:1 | 4.5 | PASA | Texto sobre la confirmación |
| humo / noche | 7.33:1 | 3.0 | PASA | Anillo de foco contra el fondo base |
| velador / noche | 9.54:1 | 3.0 | PASA | Borde de foco contra el fondo base |
| hueso / pared | 13.20:1 | 3.0 | PASA | Borde de la tarjeta contra su superficie |

El par más ajustado es **humo sobre pared, 6.33:1**, con un margen de 1.83 sobre el mínimo. No hay
ningún par al límite.

---

## 7. Principios

1. **Una sola cosa luminosa.** Si dos elementos compiten por la atención, uno está de más.
2. **El ámbar es un recurso escaso.** Progreso y acción principal. Nada más.
3. **Nada es rojo. Nada se pierde.** Ni la ausencia ni el error se pintan como castigo. Lo hecho
   queda marcado para siempre.
4. **El vacío es contenido.** El centro de la pantalla del plan no se rellena.
5. **La tipografía hace el trabajo pesado.** El verbo del paso es el elemento gráfico más grande de
   la app; reemplaza a cualquier ilustración o ícono decorativo.
6. **Nada decora.** Sin gradientes de adorno, sin sombras genéricas repetidas, sin bordes
   decorativos. La tarjeta tiene una sombra en dos capas (ambiente y directa) y un borde
   semitransparente, y con eso alcanza.

---

## 8. Lo que este diseño evita a propósito

Los cinco clichés de interfaz generada, y cómo:

| Cliché | Cómo se evita |
|---|---|
| Fondo crema con serif de alto contraste y acento terracota | No hay fondo claro, ni serif, ni terracota |
| Fondo casi negro con un único acento verde ácido o bermellón | El fondo es índigo con violeta (`#171633`), y hay **dos** acentos con roles distintos: ámbar para la acción, menta para lo hecho |
| Layout de diario: filetes finos, esquinas rectas, columnas densas | Una sola columna, radios de 20&nbsp;px, cero filetes |
| El kit de tarjetas SaaS: tarjetas idénticas con la misma sombra gris | Hay **una** tarjeta en toda la pantalla del plan, y su sombra es cálida, teñida hacia el índigo del fondo |
| Etiquetas en mayúsculas espaciadas, monospace para datos chicos, flechas al final de los enlaces | Sin etiquetas en mayúsculas, sin monospace decorativo, sin flechas |

---

## 9. Fuera de alcance de este plan visual

Variante clara y conmutador de tema; ilustraciones e íconos propios; pantalla de inicio o
presentación; tipografía para el plano de la casa (llega en el entregable 3); estado del
temporizador contrarreloj (entregable 4).
