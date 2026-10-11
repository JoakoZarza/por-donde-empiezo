import { useParams } from 'react-router'
import { useTitulo } from '../estado/useTitulo'

// PLACEHOLDER: el contenido real llega en la Tarea 18 (la pantalla central).
export default function Plan() {
  const { planId } = useParams()
  useTitulo('El plan')
  return (
    <main>
      <h1>El plan</h1>
      <p>{planId}</p>
    </main>
  )
}
