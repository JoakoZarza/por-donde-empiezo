import { NavLink, useLocation } from 'react-router'

/*
  La navegación estable de la app: cuatro pestañas abajo, al alcance del pulgar.

  Antes Tu casa, Lo que hiciste y Ajustes solo se alcanzaban desde tres botones al
  pie de la primera pantalla —compitiendo con el botón principal— y de cada una se
  salía con un «Volver al principio». En una app instalada no hay botón Atrás, así
  que la única forma de moverse era ese ida y vuelta.

  Aparece solo en las cuatro secciones. Armar un ambiente, elegir el tiempo y el
  plan son un recorrido con principio y fin: ahí la barra distrae, y en el plan
  competiría con «Listo», que tiene que ser lo único que brilla.

  Cada pestaña lleva ícono Y texto: un ícono solo no le dice nada a quien abre la
  app por primera vez.
*/

const RUTAS_CON_PESTANAS = new Set(['/', '/casa', '/logros', '/ajustes'])

function hayPestanas(ruta: string): boolean {
  return RUTAS_CON_PESTANAS.has(ruta)
}

function Icono({ nombre }: { nombre: 'ordenar' | 'casa' | 'logros' | 'ajustes' }) {
  const trazos = {
    // Una lista con un tilde: elegir qué ordenar.
    ordenar: (
      <>
        <path d="M4 7.5 6 9.5 9.5 5.5" />
        <path d="M13 7.5h7M4 14h16M4 19h16" />
      </>
    ),
    // El plano: una casa.
    casa: (
      <>
        <path d="M4 11 12 4l8 7" />
        <path d="M6 10v10h12V10" />
        <path d="M10 20v-5h4v5" />
      </>
    ),
    // Lo acumulado: barras que solo suben.
    logros: (
      <>
        <path d="M5 20v-6M10 20v-9M15 20V8M20 20V4" />
      </>
    ),
    // Perillas.
    ajustes: (
      <>
        <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="10" cy="17" r="2" />
      </>
    ),
  }
  return (
    <svg
      className="pestana__icono"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {trazos[nombre]}
    </svg>
  )
}

const PESTANAS = [
  { a: '/', texto: 'Ordenar', icono: 'ordenar' },
  { a: '/casa', texto: 'Tu casa', icono: 'casa' },
  { a: '/logros', texto: 'Lo que hiciste', icono: 'logros' },
  { a: '/ajustes', texto: 'Ajustes', icono: 'ajustes' },
] as const

export default function BarraDePestanas() {
  const { pathname } = useLocation()
  if (!hayPestanas(pathname)) return null

  return (
    <nav className="pestanas" aria-label="Secciones">
      <ul className="pestanas__lista">
        {PESTANAS.map((pestana) => (
          <li key={pestana.a}>
            {/* `end` en «/»: si no, la primera pestaña quedaría marcada en todas. */}
            <NavLink to={pestana.a} end className="pestana">
              <Icono nombre={pestana.icono} />
              <span className="pestana__texto">{pestana.texto}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
