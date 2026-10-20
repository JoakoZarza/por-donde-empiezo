/*
  El velador apagado: la imagen de los estados vacíos y sin salida.

  Toda la app cuenta la misma historia —una casa a oscuras con un velador que
  ilumina lo siguiente—, y una pantalla vacía es ese velador todavía sin prender. Sin
  esto, «No encontramos ese plan» o «Todavía no hay nada anotado» se leían igual que
  un error: texto suelto sobre fondo oscuro.

  Es decorativa: el texto de cada pantalla ya dice todo lo que hace falta.
*/
export default function LamparaApagada() {
  return (
    <svg
      className="lampara-apagada"
      viewBox="0 0 64 64"
      width="64"
      height="64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* La pantalla del velador. */}
      <path d="M22 12h20l7 20H15l7-20Z" />
      {/* El pie y la base. */}
      <path d="M32 32v18" />
      <path d="M22 52h20" />
      {/* El cordón, colgando: está apagado. */}
      <path d="M40 32v6" />
      <circle cx="40" cy="40.5" r="1.5" />
    </svg>
  )
}
