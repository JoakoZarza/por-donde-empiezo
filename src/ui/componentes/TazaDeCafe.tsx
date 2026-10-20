/*
  Una taza de café, para el aporte por Cafecito.

  Trazo, del mismo grosor y terminación que los íconos de la barra de pestañas, para
  que se lea como parte de la app y no como un logo pegado. El vapor es quieto: el
  plan visual reserva el movimiento para el viaje de la luz.

  Decorativa: el texto del botón al lado ya dice qué es.
*/
export default function TazaDeCafe({ tamano = 24 }: { tamano?: number }) {
  return (
    <svg
      className="taza-de-cafe"
      viewBox="0 0 24 24"
      width={tamano}
      height={tamano}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* El vapor. */}
      <path d="M8 2.5c-.6.8-.6 1.7 0 2.5s.6 1.7 0 2.5" />
      <path d="M12 2.5c-.6.8-.6 1.7 0 2.5s.6 1.7 0 2.5" />
      {/* La taza y el asa. */}
      <path d="M4 10h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-5Z" />
      <path d="M16 11.5h1.5a2.5 2.5 0 0 1 0 5H16" />
      {/* El plato. */}
      <path d="M3 22h14" />
    </svg>
  )
}
