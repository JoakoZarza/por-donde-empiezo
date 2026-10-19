import { create } from 'zustand'

/*
  Los avisos que flotan por encima de las pantallas: el que confirma algo con
  «Deshacer», y el diálogo que pide confirmación antes de una acción destructiva.

  Viven en un store propio, fuera de las pantallas, porque la acción que los dispara
  muchas veces cambia la pantalla: saltear el último paso lleva al cierre del plan,
  y el «Deshacer» tiene que seguir ahí aunque la tarjeta ya no esté.
*/

export interface Aviso {
  id: number
  texto: string
  /** Si está, el aviso ofrece un botón con esta etiqueta. */
  accion?: { etiqueta: string; alTocar: () => void | Promise<void> }
}

export interface PedidoDeConfirmacion {
  titulo: string
  texto: string
  /** Lo que dice el botón que confirma: la acción, con su nombre. «Borrar todo», no «Aceptar». */
  confirmar: string
  /** Si es destructiva, el botón se distingue del resto. */
  destructiva?: boolean
}

interface EstadoAvisos {
  aviso: Aviso | null
  avisar(texto: string, accion?: Aviso['accion']): void
  cerrarAviso(id: number): void

  confirmacion: (PedidoDeConfirmacion & { responder: (si: boolean) => void }) | null
  /**
   * Como `window.confirm`, pero con el diseño de la app y sin bloquear la página.
   * Devuelve si la persona confirmó.
   */
  confirmar(pedido: PedidoDeConfirmacion): Promise<boolean>
}

let siguienteId = 1

export const useAvisos = create<EstadoAvisos>((set, get) => ({
  aviso: null,

  avisar(texto, accion) {
    // Uno por vez: el nuevo reemplaza al anterior. Apilar avisos en un celular tapa
    // la pantalla, y el que importa es siempre el último.
    set({ aviso: { id: siguienteId++, texto, accion } })
  },

  cerrarAviso(id) {
    if (get().aviso?.id === id) set({ aviso: null })
  },

  confirmacion: null,

  confirmar(pedido) {
    // Si había otro pedido abierto, se responde que no: nunca queda una promesa colgada.
    get().confirmacion?.responder(false)
    return new Promise<boolean>((resolver) => {
      set({
        confirmacion: {
          ...pedido,
          responder: (si) => {
            set({ confirmacion: null })
            resolver(si)
          },
        },
      })
    })
  },
}))
