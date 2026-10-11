import { useParams } from 'react-router'
import { useTitulo } from '../estado/useTitulo'

// PLACEHOLDER: el contenido real llega en la Tarea 16 (la lista de tareas del ambiente).
export default function Armado() {
  const { ambienteId } = useParams()
  useTitulo('Armar el ambiente')
  return (
    <main>
      <h1>Armar el ambiente</h1>
      <p>{ambienteId}</p>
    </main>
  )
}
