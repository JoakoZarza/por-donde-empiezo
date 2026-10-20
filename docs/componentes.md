# Componentes y piezas compartidas

Lo que ya existe para que una pantalla nueva no invente su propia variante. Si algo de
acá no alcanza, se amplía la pieza, no se copia al lado.

Las reglas de redacción —imperativo con voseo, glosario de acciones— están en
`AGENTS.md`. Los colores, tipografías y el movimiento, en el plan visual
(`docs/superpowers/specs/2026-10-10-por-donde-empiezo-plan-visual.md`).

---

## Estructura de una pantalla

```tsx
<main className="pantalla">
  <h1 className="pantalla__titulo">¿Qué querés ordenar?</h1>
  <p className="menudo">Una línea de ayuda, si hace falta.</p>

  <section className="grupo">
    <h2 className="grupo__titulo">Título de sección</h2>
    …
  </section>

  <div className="pantalla__pie">
    <button className="boton-principal">Armá el plan</button>
  </div>
</main>
```

- `.pantalla` ya trae las safe areas, el ancho máximo y el margen para la barra de
  pestañas cuando la hay. Una pantalla sin estas clases deja el pie debajo de la barra
  de gestos.
- **Un solo `h1` por pantalla**, aunque no se vea (`className="sr-only"`, como en el plan).
- **Todo título de sección es `.grupo__titulo`**, sea un `<h2>` o la `<legend>` de un
  `<fieldset>`. `.pantalla__titulo` es solo para el `h1`.
- `.pantalla__pie` se pega abajo con `margin-top: auto`.

## Botones

| Clase | Para qué |
|---|---|
| `.boton-principal` | La acción de la pantalla. Una sola por pantalla. Ámbar. |
| `.boton-secundario` | Todo lo demás. Sirve también en `<Link>` y en `<label>`. |
| `.boton-destructivo` | Lo que borra. Siempre detrás de `confirmar()`. Sin rojo. |

**`<BotonConCarga cargando={…}>`** — para cualquier botón que espera algo. Pone un
spinner al lado de la etiqueta (que no cambia), lo deshabilita y marca `aria-busy`.
Nunca cambiar la etiqueta a «Guardando…».

```tsx
<BotonConCarga className="boton-principal" onClick={armar} cargando={armando}>
  Armá el plan
</BotonConCarga>
```

## Campos

```tsx
<form className="campo" noValidate onSubmit={…}>
  <label className="campo__etiqueta" htmlFor="tarea-propia">Agregar algo mío</label>
  <div className="campo__fila">
    <input id="tarea-propia" className="campo__entrada" maxLength={200}
      aria-invalid={hayError} aria-describedby="tarea-propia-error" … />
    <BotonConCarga type="submit" cargando={agregando}>Agregá</BotonConCarga>
  </div>
  {error && <p id="tarea-propia-error" className="alerta" role="status">{error}</p>}
</form>
```

- `.campo__entrada` para todo campo de texto; `.campo__entrada--varias-lineas` en un
  `<textarea>`. Nunca un campo sin clase: queda con el estilo del navegador.
- Siempre dentro de un `<form>` con `noValidate`: Enter envía, y la validación es
  nuestra, no la burbuja del navegador.
- El error va **pegado al campo**, con `aria-describedby`, y el foco vuelve al campo.
- En un `<textarea>`, Ctrl/⌘+Enter envía.
- Todo campo tiene `maxLength`.

**`<SelectorDeArchivo id etiqueta accept alElegir elegido?>`** — en lugar de
`<input type="file">`. Se ve como un botón secundario y conserva el foco y la cámara.

## Avisos

| Pieza | Para qué |
|---|---|
| `.alerta` | Algo que no salió, junto a lo que lo causó. Barra ámbar, sin rojo. |
| `useAvisos().avisar(texto, accion?)` | Confirmar algo que pasó fuera de la vista, o dar «Deshacer». Flota arriba, se va solo a los 6&nbsp;s. |
| `await useAvisos().confirmar({ titulo, texto, confirmar, destructiva })` | Antes de algo que no se deshace. Reemplaza a `window.confirm`. |

```ts
avisar(`Salteaste «${nombre}».`, { etiqueta: 'Deshacer', alTocar: deshacer })

if (!(await confirmar({ titulo: '¿Borrar la clave?', texto: '…', confirmar: 'Borrá la clave', destructiva: true }))) return
```

El botón que abre una confirmación termina en `…`; el que confirma repite la acción sin
`…`. Nunca «Aceptar».

## Cargas y vacíos

| Pieza | Cuándo |
|---|---|
| `<Esqueleto forma="tareas" \| "cuartos" \| "totales" \| "ajustes">` | Mientras una pantalla lee el teléfono. Ocupa el mismo lugar que el contenido real. |
| `<ErrorDeCarga titulo alReintentar>` | Si la lectura falló. Toda carga tiene `try/catch` y llega acá. |
| `<LamparaApagada />` | Arriba del `h1` en los vacíos y en los «no encontramos». |

Una pantalla nunca queda en «Cargando…» para siempre, ni vacía sin un paso siguiente.

## Navegación

`<BarraDePestanas />` se monta una vez en `Rutas` y aparece sola en `/`, `/casa`,
`/logros` y `/ajustes`. El recorrido —armar, elegir el tiempo, el plan— no la lleva.
Una pantalla nueva que sea sección se suma a `RUTAS_CON_PESTANAS` y a `PESTANAS`.

## Movimiento

El plan visual reserva el movimiento para **el viaje de la luz** al tocar «Listo». Las
únicas otras animaciones son de carga —el spinner y el latido del esqueleto—, y las
dos se apagan con `prefers-reduced-motion`. Nada entra, rebota ni se desliza.

Los estados de los botones (`:hover` con puntero fino, `:active`) cambian **solo el
color**: `AGENTS.md` exige más contraste al tocar y al pasar por encima, y el plan
visual prohíbe efectos de movimiento. Las dos reglas se cumplen así.
