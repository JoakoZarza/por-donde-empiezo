import { useEffect, useRef, useState } from 'react'
import { useAvisos } from '../estado/avisos'

/*
  Donde se dibujan los avisos del store `useAvisos`. Se monta una sola vez, junto a
  las rutas, y queda por encima de cualquier pantalla.
*/

/** Cuánto queda a la vista un aviso. Alcanza para leerlo y llegar a tocar «Deshacer». */
const DURACION_MS = 6000

function AvisoFlotante() {
  const aviso = useAvisos((estado) => estado.aviso)
  const cerrarAviso = useAvisos((estado) => estado.cerrarAviso)
  const [enUso, setEnUso] = useState(false)

  /*
    Se va solo, salvo mientras la persona lo está usando —el dedo o el foco
    encima—: que desaparezca justo cuando se iba a tocar «Deshacer» es peor que no
    tenerlo.
  */
  useEffect(() => {
    if (!aviso || enUso) return
    const reloj = setTimeout(() => cerrarAviso(aviso.id), DURACION_MS)
    return () => clearTimeout(reloj)
  }, [aviso, enUso, cerrarAviso])

  return (
    // La región existe siempre: un `aria-live` que aparece junto con su texto no
    // siempre se anuncia.
    <div className="aviso-flotante" role="status" aria-live="polite">
      {aviso && (
        <div
          className="aviso-flotante__caja"
          key={aviso.id}
          onPointerEnter={() => setEnUso(true)}
          onPointerLeave={() => setEnUso(false)}
          onFocus={() => setEnUso(true)}
          onBlur={() => setEnUso(false)}
        >
          <p className="aviso-flotante__texto">{aviso.texto}</p>
          {aviso.accion && (
            <button
              type="button"
              className="aviso-flotante__accion"
              onClick={() => {
                const { alTocar } = aviso.accion!
                cerrarAviso(aviso.id)
                void alTocar()
              }}
            >
              {aviso.accion.etiqueta}
            </button>
          )}
          <button
            type="button"
            className="aviso-flotante__cerrar"
            aria-label="Cerrar el aviso"
            onClick={() => cerrarAviso(aviso.id)}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}
    </div>
  )
}

/*
  El diálogo de confirmación. Reemplaza a `window.confirm`, que rompía el diseño,
  decía «Aceptar» en vez de la acción, y en una PWA instalada en iOS puede no
  aparecer.

  Usa `<dialog>` con `showModal`: el navegador atrapa el foco, Escape cancela y el
  resto de la página queda inerte. El foco arranca en «Cancelar», la opción segura,
  y al cerrar vuelve al botón que lo abrió.
*/
function Confirmacion() {
  const confirmacion = useAvisos((estado) => estado.confirmacion)
  const dialogo = useRef<HTMLDialogElement>(null)
  const cancelar = useRef<HTMLButtonElement>(null)
  const origen = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const elemento = dialogo.current
    if (!elemento) return

    if (confirmacion) {
      origen.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      if (!elemento.open) {
        // jsdom y algunos navegadores viejos no tienen `showModal`.
        if (typeof elemento.showModal === 'function') elemento.showModal()
        else elemento.setAttribute('open', '')
      }
      cancelar.current?.focus()
    } else if (elemento.open) {
      if (typeof elemento.close === 'function') elemento.close()
      else elemento.removeAttribute('open')
      origen.current?.focus()
      origen.current = null
    }
  }, [confirmacion])

  return (
    <dialog
      ref={dialogo}
      className="dialogo"
      aria-labelledby="dialogo-titulo"
      aria-describedby="dialogo-texto"
      onCancel={(evento) => {
        // Escape: se cancela por nuestro camino, para que la promesa se resuelva.
        evento.preventDefault()
        confirmacion?.responder(false)
      }}
    >
      {confirmacion && (
        <>
          <h2 id="dialogo-titulo" className="dialogo__titulo">
            {confirmacion.titulo}
          </h2>
          <p id="dialogo-texto" className="menudo">
            {confirmacion.texto}
          </p>
          <div className="dialogo__acciones">
            <button
              ref={cancelar}
              type="button"
              className="boton-secundario"
              onClick={() => confirmacion.responder(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={confirmacion.destructiva ? 'boton-destructivo' : 'boton-principal'}
              onClick={() => confirmacion.responder(true)}
            >
              {confirmacion.confirmar}
            </button>
          </div>
        </>
      )}
    </dialog>
  )
}

export default function Avisos() {
  return (
    <>
      <AvisoFlotante />
      <Confirmacion />
    </>
  )
}
