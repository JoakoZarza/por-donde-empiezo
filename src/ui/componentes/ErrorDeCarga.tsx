import { Link } from 'react-router'

/*
  Lo que se ve cuando una pantalla no pudo leer el teléfono.

  Antes ninguna carga capturaba el error: si IndexedDB fallaba —modo privado de
  Safari, disco lleno, una base a medio migrar— la pantalla quedaba en «Cargando…»
  para siempre. Un callejón sin salida que además no decía nada.

  Siempre ofrece dos salidas: probar de nuevo, y volver al principio, porque en una
  app instalada no hay botón Atrás.
*/
interface Props {
  titulo: string
  alReintentar: () => void
}

export default function ErrorDeCarga({ titulo, alReintentar }: Props) {
  return (
    <main className="pantalla">
      <h1 className="pantalla__titulo">{titulo}</h1>
      <p className="alerta" role="alert">
        No pudimos leer tus datos de este teléfono. No se borró nada: probá de nuevo en un momento.
      </p>
      <div className="pantalla__pie">
        <Link className="boton-secundario" to="/">
          Volvé al principio
        </Link>
        <button type="button" className="boton-principal" onClick={alReintentar}>
          Probá de nuevo
        </button>
      </div>
    </main>
  )
}
