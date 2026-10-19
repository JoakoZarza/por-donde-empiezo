/*
  La silueta de una pantalla mientras lee el teléfono.

  Usa las mismas clases que el contenido real —`.tareas`, `.casa`, `.totales`,
  `.fichas`— para ocupar exactamente el mismo lugar: cuando llegan los datos, la
  pantalla se completa en vez de saltar. Antes había un «Cargando…» de una línea y
  después el contenido aparecía de golpe, empujando todo.

  Para lectores de pantalla es un solo aviso: «Cargando…». Las formas son decorativas.
*/

type Forma = 'tareas' | 'cuartos' | 'totales' | 'ajustes'

/** Cuántos cuartos tiene el plano: los del catálogo. */
const CUARTOS = 8

function Barra({ ancho }: { ancho: string }) {
  return <span className="esqueleto__barra" style={{ width: ancho }} />
}

function Formas({ forma }: { forma: Forma }) {
  switch (forma) {
    case 'tareas':
      return (
        <>
          {[3, 2].map((cantidad, grupo) => (
            <div key={grupo} className="grupo">
              <Barra ancho="30%" />
              <ul className="tareas">
                {Array.from({ length: cantidad }, (_, indice) => (
                  <li key={indice} className="tarea esqueleto__bloque">
                    <Barra ancho={`${55 + ((indice * 13) % 30)}%`} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )
    case 'cuartos':
      return (
        <ul className="casa">
          {Array.from({ length: CUARTOS }, (_, indice) => (
            <li key={indice} className="cuarto esqueleto__bloque" />
          ))}
        </ul>
      )
    case 'totales':
      return (
        <ul className="totales">
          {Array.from({ length: 3 }, (_, indice) => (
            <li key={indice} className="total esqueleto__bloque">
              <Barra ancho="50%" />
            </li>
          ))}
        </ul>
      )
    case 'ajustes':
      return (
        <>
          {[6, 3].map((cantidad, grupo) => (
            <div key={grupo} className="grupo">
              <Barra ancho="40%" />
              <ul className={grupo === 0 ? 'fichas' : 'fichas fichas--una-columna'}>
                {Array.from({ length: cantidad }, (_, indice) => (
                  <li key={indice} className="ficha esqueleto__bloque" />
                ))}
              </ul>
            </div>
          ))}
        </>
      )
  }
}

export default function Esqueleto({ forma }: { forma: Forma }) {
  return (
    <div className="esqueleto" aria-busy="true">
      <p className="sr-only" role="status" aria-live="polite">
        Cargando…
      </p>
      <div aria-hidden="true" className="esqueleto__formas">
        <Formas forma={forma} />
      </div>
    </div>
  )
}
