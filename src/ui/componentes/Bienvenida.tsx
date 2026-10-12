import { useEffect, useState } from 'react'
import { calcularTotales, diasSinVenir } from '../../domain/logros'
import { useSesion } from '../estado/sesion'

/*
  El saludo de la primera pantalla.

  Cumple las dos mitades de la promesa de los totales. La primera: lo que hiciste
  sigue ahí, aunque hayas dejado de entrar. La segunda, y es la importante: cuando
  volvés después de unos días, la app **te lo dice** en vez de hacer como si nada.
  Volver es lo difícil, y merece que se note.

  No reclama nada: no dice cuántos días faltaste como si fuera una deuda, ni cuánto
  perdiste —porque no se pierde nada—.
*/

const NUMERO = new Intl.NumberFormat('es-AR')

export default function Bienvenida() {
  const repositorio = useSesion((estado) => estado.repositorio)
  const [cuantas, setCuantas] = useState<number | null>(null)
  const [volviste, setVolviste] = useState(false)

  useEffect(() => {
    let vigente = true

    void (async () => {
      const historial = await repositorio.listarHistorial()
      if (!vigente) return

      const totales = calcularTotales(historial)
      if (totales.tareas === 0) return

      const dias = diasSinVenir(totales, new Date().toISOString())
      if (dias !== null && dias >= 3) setVolviste(true)
      setCuantas(totales.tareas)
    })()

    return () => {
      vigente = false
    }
  }, [repositorio])

  if (cuantas === null) return null

  return (
    <div className="bienvenida">
      {volviste && <p className="bienvenida__volviste">Volviste. Está todo donde lo dejaste.</p>}
      <p className="menudo">
        {cuantas === 1
          ? 'Llevás 1 tarea terminada.'
          : `Llevás ${NUMERO.format(cuantas)} tareas terminadas.`}
      </p>
    </div>
  )
}
