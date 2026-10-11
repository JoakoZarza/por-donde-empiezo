import { Link } from 'react-router'
import { useTitulo } from '../estado/useTitulo'

/*
  Ninguna pantalla deja a la persona sin salida: siempre hay un paso siguiente o
  una vuelta atrás. Es una regla de AGENTS.md, y acá es además la red de seguridad
  para un enlace viejo.
*/
export default function NoEncontrada() {
  useTitulo('No encontramos esa pantalla')
  return (
    <main>
      <h1>No encontramos esa pantalla</h1>
      <p>Puede que el enlace esté viejo.</p>
      <Link to="/">Volver al principio</Link>
    </main>
  )
}
