import { Link } from 'react-router'
import { useTitulo } from '../estado/useTitulo'

/*
  Ninguna pantalla deja a la persona sin salida: siempre hay un paso siguiente o
  una vuelta atrás. Es una regla de AGENTS.md, y acá es además la red de seguridad
  para un enlace viejo.

  Usa las mismas clases que el resto de las pantallas —y no un `<main>` pelado—
  porque de ellas salen las safe areas del notch y de la barra de gestos. En una
  app instalada, esta pantalla podía quedar con el botón debajo de la barra.
*/
export default function NoEncontrada() {
  useTitulo('No encontramos esa pantalla')

  return (
    <main className="pantalla">
      <h1 className="pantalla__titulo">No encontramos esa pantalla</h1>
      <p className="menudo">Puede que el enlace esté viejo.</p>
      <div className="pantalla__pie">
        <Link className="boton-principal" to="/">
          Volver al principio
        </Link>
      </div>
    </main>
  )
}
