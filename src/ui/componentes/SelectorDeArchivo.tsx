/*
  Un selector de archivo que se ve como el resto de los botones.

  El nativo —«Seleccionar archivo · Ningún archivo seleccionado», en gris— era la
  señal más clara de prototipo en toda la app. Acá el `<input>` sigue existiendo y
  es el que recibe el foco y el toque, pero visualmente oculto: la etiqueta que lo
  envuelve es la que se ve. Así no se pierde nada de lo que daba el nativo —teclado,
  lector de pantalla, cámara en el celular— y el foco visible sale de
  `:has(:focus-visible)`, el mismo patrón que usan las fichas.
*/
interface Props {
  id: string
  etiqueta: string
  accept: string
  alElegir: (archivo: File) => void
  /** El nombre de lo elegido, si la pantalla lo conserva (la foto para la IA). */
  elegido?: string | null
}

export default function SelectorDeArchivo({ id, etiqueta, accept, alElegir, elegido }: Props) {
  return (
    <div className="selector-archivo">
      <label className="boton-secundario selector-archivo__boton" htmlFor={id}>
        {etiqueta}
        <input
          id={id}
          name={id}
          type="file"
          className="selector-archivo__entrada"
          accept={accept}
          onChange={(evento) => {
            const archivo = evento.target.files?.[0]
            if (archivo) alElegir(archivo)
            // Se limpia para que elegir el mismo archivo dos veces vuelva a disparar.
            evento.target.value = ''
          }}
        />
      </label>
      {elegido && (
        <p className="menudo selector-archivo__elegido" translate="no">
          {elegido}
        </p>
      )}
    </div>
  )
}
