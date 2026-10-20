import type { ButtonHTMLAttributes } from 'react'

/*
  Un botón que muestra que está trabajando sin cambiar lo que dice.

  Antes cada pantalla lo resolvía a su manera: unas ponían `aria-busy` y no cambiaba
  nada visible —el botón parecía no responder—, otras cambiaban la etiqueta a
  «Pensando…» y el botón cambiaba de ancho y de nombre a mitad de la acción. La
  regla es otra: la etiqueta se queda, aparece un spinner al lado, y el botón se
  deshabilita mientras dura, para que un segundo toque no repita la acción.
*/
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  cargando: boolean
}

export default function BotonConCarga({ cargando, disabled, children, className, ...resto }: Props) {
  return (
    <button
      type="button"
      {...resto}
      className={`${className ?? 'boton-secundario'} boton-con-carga`}
      disabled={disabled || cargando}
      aria-busy={cargando}
    >
      {cargando && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  )
}
