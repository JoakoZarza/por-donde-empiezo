import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { calcularLogros, calcularTotales, diasEntre } from '../../domain/logros'
import { useSesion } from '../estado/sesion'
import { useTitulo } from '../estado/useTitulo'
import ErrorDeCarga from '../componentes/ErrorDeCarga'
import Esqueleto from '../componentes/Esqueleto'
import type { Logro, Totales } from '../../domain/logros'

/*
  Lo que hiciste, desde el principio.

  Esta pantalla existe para una sola cosa: que el esfuerzo de hoy se sume al de
  siempre. Por eso muestra totales acumulados y no el avance de la sesión en curso,
  y por eso no hay nada en rojo, ni barras que se vacíen, ni «te faltan 12 días para
  recuperar la racha». La ausencia nunca se muestra como deuda.

  Los números y las fechas se formatean con `Intl`: el formato es una decisión del
  sistema de la persona, no mía.
*/

const NUMERO = new Intl.NumberFormat('es-AR')
const RELATIVO = new Intl.RelativeTimeFormat('es-AR', { numeric: 'auto' })

function duracion(minutos: number): string {
  if (minutos < 60) return `${NUMERO.format(minutos)} min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return resto === 0 ? `${NUMERO.format(horas)} h` : `${NUMERO.format(horas)} h ${NUMERO.format(resto)} min`
}

function cuando(instante: string, ahora: string): string {
  const dias = Math.max(0, diasEntre(instante, ahora))
  if (dias === 0) return 'hoy'
  if (dias < 30) return RELATIVO.format(-dias, 'day')
  return RELATIVO.format(-Math.round(dias / 30), 'month')
}

export default function Logros() {
  const repositorio = useSesion((estado) => estado.repositorio)
  const cantidadDeAmbientes = useSesion((estado) => estado.ambientes.length)

  const [totales, setTotales] = useState<Totales | null>(null)
  const [logros, setLogros] = useState<Logro[]>([])
  const [ahora, setAhora] = useState<string>('')
  const [falloLaCarga, setFalloLaCarga] = useState(false)
  const [intento, setIntento] = useState(0)

  useTitulo('Lo que hiciste')

  useEffect(() => {
    let vigente = true

    void (async () => {
      try {
        const historial = await repositorio.listarHistorial()
        if (!vigente) return
        const calculados = calcularTotales(historial)
        setTotales(calculados)
        setLogros(calcularLogros(calculados, cantidadDeAmbientes))
        setAhora(new Date().toISOString())
      } catch {
        if (vigente) setFalloLaCarga(true)
      }
    })()

    return () => {
      vigente = false
    }
  }, [repositorio, cantidadDeAmbientes, intento])

  function reintentar(): void {
    setFalloLaCarga(false)
    setIntento((previo) => previo + 1)
  }

  if (falloLaCarga) return <ErrorDeCarga titulo="Lo que hiciste" alReintentar={reintentar} />

  if (!totales) {
    return (
      <main className="pantalla">
        <h1 className="pantalla__titulo">Lo que hiciste</h1>
        <Esqueleto forma="totales" />
      </main>
    )
  }

  // Todavía no hizo nada: se invita a empezar, sin cifras en cero ni culpa.
  if (totales.tareas === 0) {
    return (
      <main className="pantalla">
        <h1 className="pantalla__titulo">Lo que hiciste</h1>
        <p className="menudo">
          Acá va a quedar todo lo que hagas, y no se borra nunca: ni aunque dejes de entrar, ni aunque reinicies un
          ambiente. Todavía no hay nada anotado.
        </p>
        <div className="pantalla__pie">
          <Link className="boton-principal" to="/">
            Elegir ambientes
          </Link>
        </div>
      </main>
    )
  }

  const conseguidos = logros.filter((cada) => cada.conseguido)
  const siguiente = logros.find((cada) => !cada.conseguido)

  return (
    <main className="pantalla">
      <h1 className="pantalla__titulo">Lo que hiciste</h1>

      <ul className="totales">
        <li className="total">
          <span className="total__numero tabular">{NUMERO.format(totales.tareas)}</span>
          <span className="menudo">{totales.tareas === 1 ? 'tarea terminada' : 'tareas terminadas'}</span>
        </li>
        <li className="total">
          <span className="total__numero tabular">{duracion(totales.minutos)}</span>
          <span className="menudo">de trabajo</span>
        </li>
        <li className="total">
          <span className="total__numero tabular">{NUMERO.format(totales.diasActivos)}</span>
          <span className="menudo">{totales.diasActivos === 1 ? 'día' : 'días'}</span>
        </li>
      </ul>

      {totales.ultimoEn && ahora && (
        <p className="menudo">
          La última vez fue {cuando(totales.ultimoEn, ahora)}
          {totales.primeroEn && totales.primeroEn !== totales.ultimoEn
            ? `, y la primera fue ${cuando(totales.primeroEn, ahora)}`
            : ''}
          .
        </p>
      )}

      {conseguidos.length > 0 && (
        <section className="grupo">
          <h2 className="pantalla__titulo">Lo que ya te ganaste</h2>
          <ul className="fichas fichas--una-columna">
            {conseguidos.map((cada) => (
              <li key={cada.id} className="logro">
                <span className="logro__marca" aria-hidden="true" />
                <span className="ficha__texto">
                  {cada.nombre}
                  <span className="menudo">{cada.detalle}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/*
        Solo el siguiente. Mostrar todos los que faltan sería una lista de deudas
        pendientes, y la app no funciona así: marca un rumbo, no un debe.
      */}
      {siguiente && (
        <p className="menudo">
          Lo que sigue: <strong>{siguiente.nombre}</strong> — {siguiente.detalle}
        </p>
      )}

      <div className="pantalla__pie">
        <Link className="boton-principal" to="/sesion/nueva">
          Ponerme con algo
        </Link>
      </div>
    </main>
  )
}
