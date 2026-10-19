# Checklist de producto: de «proyecto» a «producto»

Revisión de diseño de producto sobre el código actual (`master`, 19/10/2026), contra
`AGENTS.md` y la especificación. Cada ítem dice **qué pasa hoy**, **dónde** y **qué hacer**.

> Nota de alcance: la app no tiene gastos ni campos numéricos. Lo equivalente son los
> ambientes (habitaciones), las tareas propias, la playlist, la clave de IA y el respaldo.

Prioridad: 🔴 se nota roto · 🟠 se nota «hecho a las apuradas» · 🟢 pulido.

---

## 1. Estados de carga

- [x] 🔴 **Ninguna carga tiene `try/catch`: si IndexedDB falla, la pantalla queda en «Cargando…» para siempre.**
  Pasa en `Casa.tsx:38`, `Logros.tsx:163`, `Ajustes.tsx:62`, `Plan.tsx:369`, `Armado.tsx:203`,
  `ArranqueSesion.tsx:72` y `Bienvenida.tsx:127`. Hacer un estado `error` con mensaje y botón
  «Probá de nuevo», igual en todas.
- [x] 🔴 **Armado no tiene estado de carga.** Mientras lee el teléfono se ve el título y una
  lista vacía, y los botones «Listo, ¿cuánto tiempo tengo?» ya funcionan (`Armado.tsx:400`).
  Mostrar un skeleton de 2–3 grupos de tareas y deshabilitar el avance hasta que cargue.
- [x] 🟠 **Reemplazar los «Cargando…» de texto por skeletons que imiten la pantalla final**
  (`Casa.tsx:64`, `Logros.tsx:177`, `Ajustes.tsx:198`). Hoy el contenido aparece de golpe y
  todo salta (CLS). Casa: grilla de cuartos apagados; Logros: tres tarjetas de totales vacías.
- [ ] 🟠 **«¿Cuánto tiempo tenés?» no explica por qué el botón está deshabilitado mientras carga**
  (`ArranqueSesion.tsx:273`). Además, al terminar de cargar pisa el modo que la persona ya haya
  tocado (`setModo` en la línea 89 no tiene la guarda que sí tiene el tiempo). Agregar
  `modoTocado` y un skeleton o texto «Mirando tus tareas…».
- [ ] 🟠 **No hay un solo spinner en la app.** Los botones usan `aria-busy` pero no cambia nada
  visible (`PrimeraVez.tsx:93`, `ArranqueSesion.tsx:274`). Crear un componente
  `<BotonConCarga>` con spinner que **conserva la etiqueta** (regla de `AGENTS.md`).
- [ ] 🟠 **«Pedir ideas» y «Probar» cambian la etiqueta a «Pensando…» / «Probando…» y no se
  deshabilitan** (`Armado.tsx:479`, `Ajustes.tsx:374`): se puede disparar el pedido dos veces y
  gastar cuota de la clave. Usar el mismo `<BotonConCarga>`.
- [x] 🔴 **Doble toque en «Listo» anotaba dos veces el mismo paso en el historial** (`Plan.tsx:682`): no hay guarda mientras se
  guarda. Lo mismo en «Armá las tareas» (`PrimeraVez.tsx:88`, no se deshabilita con `guardando`).
- [ ] 🟢 «Guardar una copia» y «Traer de otra copia» no muestran nada mientras trabajan
  (`Ajustes.tsx:149`, `:168`); con un historial grande se nota.

## 2. Estados vacíos

- [ ] 🟠 **La primera pantalla no le dice a una persona nueva qué es la app.** Es un título, ocho
  fichas y «Elegí al menos un ambiente.» (`PrimeraVez.tsx:46`). Sumar una línea de propuesta
  de valor arriba («No tenés que ordenar todo, solo lo siguiente.» ya existe en `index.html`) y
  sacar el aviso de «Elegí al menos…» hasta que la persona intente avanzar.
- [x] 🔴 **Quien vuelve encuentra la selección vacía**, aunque ya haya elegido ambientes antes
  (`PrimeraVez.tsx:19`, `useState([])`). La bienvenida dice «Está todo donde lo dejaste» y la
  pantalla dice lo contrario. Precargar los ambientes guardados, o para quien vuelve mostrar
  directo «Seguí donde quedaste» con el plan o la casa.
- [ ] 🟠 **Armado con todas las tareas destildadas** no dice nada y deja avanzar
  (`Armado.tsx:405`). Mostrar «No quedó nada en este ambiente. Tildá algo o agregá una tuya.»
- [ ] 🟠 **Armado con un ambiente que no existe** (`/armar/lo-que-sea`) muestra «Ambiente» y una
  lista vacía (`Armado.tsx:402`). Redirigir a `NoEncontrada` o mostrar un vacío con salida.
- [ ] 🟢 Los vacíos que ya existen (Casa, Logros, plan sin pasos, plan no encontrado) están bien
  resueltos en texto; falta **una ilustración o la lámpara apagada** para que no parezcan
  pantallas de error. Reutilizar `.lampara` con opacidad baja como motivo de vacío.

## 3. Manejo de errores y validación

- [x] 🔴 **Los errores se ven igual que el texto normal.** `.alerta` es solo color hueso a
  15&nbsp;px (`pantallas.css:216`). Sin rojo (regla del producto), pero con un cue redundante:
  ícono, fondo `--color-pared`, borde ámbar a la izquierda y la palabra en negrita.
- [x] 🔴 **En Ajustes todos los errores y confirmaciones aparecen al pie de la página**
  (`Ajustes.tsx:443`), lejos del campo que los causó. En el celular, «Pegá una clave primero»
  queda fuera de la vista. Mover cada mensaje junto a su control (`aria-describedby`) y hacer
  foco en el primer error.
- [x] 🔴 **«Agregar algo mío» no es un formulario**: Enter no agrega, y el botón «Agregar» está
  *después* de toda la sección de IA (`Armado.tsx:432` vs `:527`), a una pantalla de distancia
  del campo. Envolver campo + botón en un `<form>` y ponerlos juntos.
- [x] 🟠 **`agregar()` y `agregarSugerencias()` no capturan errores** (`Armado.tsx:367`, `:332`):
  si el guardado falla, la promesa rechaza sin mensaje. Además el mismo `error` sirve para el
  campo y para fallos de tildar, así que un mensaje pisa al otro.
- [ ] 🟠 **La URL de la playlist depende de la burbuja nativa del navegador** (`type="url"`,
  `Ajustes.tsx:283`): sale en el idioma y estilo del sistema, y acepta cualquier URL. Validar con
  mensaje propio («Tiene que ser un enlace de Spotify o YouTube») y `noValidate` en el form.
- [ ] 🟠 **No hay límite de largo** en la tarea propia ni en «Contá lo que ves». Una frase muy
  larga rompe la tarjeta del paso a `--texto-paso` (hasta 72&nbsp;px). Poner `maxLength` y
  `overflow-wrap: anywhere` en `.paso__accion`.
- [ ] 🟢 El `<textarea>` de IA no envía con Ctrl/⌘+Enter (regla de `AGENTS.md`), y los campos
  `tarea-propia` no tienen `name`/`autocomplete` (`Armado.tsx:435`).
- [x] 🟢 `guardarClave()` muestra «Listo, la clave quedó guardada» aunque `guardar()` haya
  fallado (el error se traga adentro, `Ajustes.tsx:115`). Hoy lo tapa el `!error` del render;
  hacer que `guardar()` devuelva `boolean`.

## 4. Feedback visual

- [ ] 🟠 **Al tocar «Listo» no hay confirmación de lo hecho**: la tarjeta cambia por la siguiente
  (con la animación `aparecer-el-paso`), pero nada dice «esto quedó hecho». Sumar un check menta
  de ~400&nbsp;ms sobre la tarjeta saliente antes del viaje de la luz, respetando
  `prefers-reduced-motion`.
- [x] 🔴 **«Saltear» no tiene deshacer** (`Plan.tsx:686`). Un toque con poca puntería saltea una
  tarea sin vuelta. Toast «Salteaste X · Deshacer» de 5&nbsp;s con `aria-live="polite"`.
- [x] 🟠 **Agregar una tarea propia o las ideas de la IA no da ninguna señal** más que un renglón
  nuevo, muchas veces fuera de la vista (va al grupo «Tus propias», arriba). Hacer scroll al
  ítem nuevo y resaltarlo, o toast «Agregaste “regar las plantas”».
- [x] 🔴 **Confirmaciones destructivas con `window.confirm`** (`Ajustes.tsx:183`): se ve como
  una alerta del sistema, rompe el diseño, y en una PWA instalada en iOS puede quedar bloqueada.
  Hacer un diálogo propio (`<dialog>` con foco atrapado y `overscroll-behavior: contain`).
- [x] 🟠 **«Empezar de cero» se ve igual que «Guardar una copia»** (`Ajustes.tsx:438`). La acción
  más destructiva de la app tiene que distinguirse: separarla al final, con estilo propio.
- [x] 🟠 **«Borrar la clave» y «Arrancar de nuevo» no confirman ni tienen deshacer**
  (`Ajustes.tsx:325`, `ArranqueSesion.tsx:254`). Regla del producto: nada se borra en silencio.
- [x] 🟠 **Los botones no tienen `:hover`, `:active` ni `:disabled` en el secundario**
  (`pantallas.css:222`). `button` declara transición de `opacity`/`transform` pero nada cambia
  nunca. Sumar `:active { transform: scale(.98) }`, más contraste en hover y estilo de
  deshabilitado para `.boton-secundario` (hoy los de la clave de IA se ven activos y no andan).
- [x] 🟢 «Listo, quedó guardado.» en Ajustes no tiene `aria-live` (`Ajustes.tsx:454`) y no
  desaparece nunca. Usar el mismo toast que el resto.

## 5. Consistencia

- [x] 🔴 **Hay campos sin estilo**: el `<textarea>` de IA, la playlist y la clave
  (`Armado.tsx:459`, `Ajustes.tsx:280`, `:348`) no usan `.campo__entrada`; se ven nativos al
  lado del campo «Agregar algo mío» que sí está estilado. Igualar todos.
- [x] 🔴 **Los selectores de archivo son nativos** (`input[type='file']`, `pantallas.css:670`):
  «Elegir archivo / Ningún archivo seleccionado» en gris es la señal más clara de «prototipo».
  Usar un `<label>` con estilo de `.boton-secundario` que envuelva el input visualmente oculto,
  conservando el foco con `:has(:focus-visible)` (el mismo patrón que ya usan las fichas).
- [ ] 🟠 **Jerarquía tipográfica plana**: los `h2` usan `.pantalla__titulo`, el mismo tamaño
  que el `h1` (Armado «¿No sabés por dónde empezar?», Ajustes, Logros, cierre del plan). Ya
  existe `.grupo__titulo` para eso: usarlo en todos los `h2`.
- [ ] 🟠 **Los títulos de sección son de dos tipos**: unos son `h2.grupo__titulo` y otros
  `legend.menudo` en gris chico (Ajustes, ¿Cuánto tiempo tenés?). Un mismo componente
  `Seccion` con título visible igual en todas las pantallas.
- [ ] 🟠 **Las etiquetas de campos usan tres clases distintas**: `campo__etiqueta`, `menudo` y
  ninguna. Unificar en `campo__etiqueta`.
- [x] 🟠 **Los botones cambian de persona gramatical y de nombre**: «Armá las tareas», «Armá el
  plan» (imperativo) vs «Elegir ambientes», «Volver al principio» (infinitivo) vs «Ponerme con
  algo» (primera persona). La misma acción se llama «Seguir un rato más», «Seguir con más
  tiempo» y «Ponerme con algo». Fijar un glosario de acciones y un modo verbal.
- [x] 🟠 **No hay navegación estable.** Casa, Logros y Ajustes solo se alcanzan desde tres
  botones al pie de la primera pantalla, compitiendo con el botón principal; dentro de cada una,
  la única salida es un botón al pie. Una barra superior mínima (atrás + título) o una barra de
  pestañas inferior para las cuatro secciones.
- [x] 🟢 **Botón dentro de un párrafo**: «Borrar la clave» está dentro de un `<p>`
  (`Ajustes.tsx:323`) y hereda el renglón; queda mal alineado.
- [x] 🟢 **La safe area de abajo se suma dos veces**: `body` ya la tiene de padding
  (`base.css:77`) y `.pantalla` la vuelve a sumar (`pantallas.css:18`). En iPhone queda un hueco
  de más debajo del «Listo».
- [ ] 🟢 Sumar a `docs/` una página de componentes (botones, campos, alertas, toast, skeleton,
  diálogo) para que las próximas pantallas no inventen variantes.

---

## Orden sugerido

1. Robustez (🔴 de las secciones 1 y 3): `try/catch` en cargas, doble toque, formulario de
   «Agregar algo mío», errores junto al campo.
2. Piezas compartidas: `BotonConCarga`, `Toast` con deshacer, `Dialogo`, `Skeleton`, `Alerta`.
3. Consistencia visual: campos, selector de archivo, jerarquía de títulos, estados de botón.
4. Producto: primera pantalla para quien vuelve, glosario de acciones, navegación.
