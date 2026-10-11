import { HOGAR_CATALOGO } from '../tipos'
import type { Ambiente, Objeto, Tarea, TipoAmbiente, Verbo } from '../tipos'

/*
  Los siete ambientes que no son la cocina, en una tabla de datos.

  Las dependencias se declaran por CLAVE dentro del mismo ambiente, no por id
  completo: `requiere: ['barrer']` en el ambiente `bano` se expande a
  `bano-barrer`. Es lo que hace que la tabla se lea como una receta y no como un
  grafo.

  Las reglas de dependencia de la sección 5.4 se codifican acá a mano, y dos de
  ellas el validador las comprueba:

    - Seco antes que húmedo: `trapear` siempre requiere `barrer`.
    - Arriba antes que abajo: `barrer` requiere TODAS las tareas que trabajan una
      superficie elevada del ambiente, porque el piso va último. Esto se descubrió
      tarde: al principio solo requería despejar la mesada, y el plan resultante
      trapeaba el piso antes de limpiar las hornallas. Ahora hay un test que lo
      impide.
    - Sacar antes que limpiar: nada se limpia antes de sacar lo que lo tapa
      (la ropa del piso antes de barrer, los papeles antes del escritorio).
*/

interface TareaPlana {
  clave: string
  verbo: Verbo
  accion: string
  descripcion: string
  min: number
  esfuerzo: 1 | 2 | 3
  impacto: 1 | 2 | 3
  requiere?: string[]
  herramientas?: string[]
  /** Clave del objeto de este ambiente sobre el que se trabaja. */
  objeto?: string
}

interface DatosAmbiente {
  id: string
  tipo: TipoAmbiente
  nombre: string
  ordenRecorrido: number
  /** Objetos como pares [clave, nombre]. */
  objetos: ReadonlyArray<readonly [string, string]>
  tareas: TareaPlana[]
}

const DATOS: DatosAmbiente[] = [
  {
    id: 'dormitorio',
    tipo: 'dormitorio',
    nombre: 'Dormitorio',
    ordenRecorrido: 1,
    objetos: [
      ['cama', 'Cama'],
      ['ropa', 'Ropa'],
      ['placard', 'Placard'],
      ['mesa-luz', 'Mesa de luz'],
      ['ventana', 'Ventana'],
      ['piso', 'Piso'],
    ],
    tareas: [
      { clave: 'cama', verbo: 'ordenar', accion: 'Hacé', descripcion: 'la cama', min: 2, esfuerzo: 1, impacto: 3, objeto: 'cama' },
      { clave: 'ropa-piso', verbo: 'guardar', accion: 'Juntá', descripcion: 'la ropa del piso', min: 3, esfuerzo: 1, impacto: 3, objeto: 'ropa' },
      { clave: 'doblar-ropa', verbo: 'ordenar', accion: 'Doblá', descripcion: 'la ropa limpia', min: 8, esfuerzo: 2, impacto: 2, requiere: ['ropa-piso'], objeto: 'ropa' },
      { clave: 'guardar-ropa', verbo: 'guardar', accion: 'Guardá', descripcion: 'la ropa doblada', min: 4, esfuerzo: 1, impacto: 2, requiere: ['doblar-ropa'], objeto: 'placard' },
      { clave: 'placard', verbo: 'ordenar', accion: 'Ordená', descripcion: 'el placard', min: 10, esfuerzo: 3, impacto: 1, requiere: ['guardar-ropa'], objeto: 'placard' },
      { clave: 'mesa-luz', verbo: 'tirar', accion: 'Tirá', descripcion: 'lo que no sirve de la mesa de luz', min: 2, esfuerzo: 1, impacto: 1, objeto: 'mesa-luz' },
      { clave: 'ventana', verbo: 'limpiar', accion: 'Limpiá', descripcion: 'la ventana', min: 5, esfuerzo: 1, impacto: 2, herramientas: ['trapo'], objeto: 'ventana' },
      { clave: 'barrer', verbo: 'limpiar', accion: 'Barré', descripcion: 'el piso', min: 4, esfuerzo: 2, impacto: 3, requiere: ['cama', 'ropa-piso', 'doblar-ropa', 'guardar-ropa', 'placard', 'mesa-luz', 'ventana'], herramientas: ['escoba'], objeto: 'piso' },
      { clave: 'trapear', verbo: 'limpiar', accion: 'Trapeá', descripcion: 'el piso', min: 5, esfuerzo: 2, impacto: 3, requiere: ['barrer'], herramientas: ['trapo', 'balde'], objeto: 'piso' },
    ],
  },
  {
    id: 'living',
    tipo: 'living',
    nombre: 'Living',
    ordenRecorrido: 2,
    objetos: [
      ['mesa', 'Mesa'],
      ['sillones', 'Sillones'],
      ['tele', 'Tele'],
      ['estantes', 'Estantes'],
      ['ventana', 'Ventana'],
      ['piso', 'Piso'],
    ],
    tareas: [
      { clave: 'mesa-despejar', verbo: 'guardar', accion: 'Despejá', descripcion: 'la mesa', min: 3, esfuerzo: 1, impacto: 3, objeto: 'mesa' },
      { clave: 'mantas', verbo: 'ordenar', accion: 'Doblá', descripcion: 'las mantas y los almohadones', min: 3, esfuerzo: 1, impacto: 2, objeto: 'sillones' },
      { clave: 'tele', verbo: 'limpiar', accion: 'Limpiá', descripcion: 'la pantalla de la tele', min: 2, esfuerzo: 1, impacto: 1, herramientas: ['trapo'], objeto: 'tele' },
      { clave: 'mesa', verbo: 'limpiar', accion: 'Limpiá', descripcion: 'la mesa', min: 3, esfuerzo: 2, impacto: 3, requiere: ['mesa-despejar'], herramientas: ['trapo'], objeto: 'mesa' },
      { clave: 'estantes', verbo: 'ordenar', accion: 'Ordená', descripcion: 'los estantes', min: 8, esfuerzo: 2, impacto: 2, objeto: 'estantes' },
      { clave: 'ventana', verbo: 'limpiar', accion: 'Limpiá', descripcion: 'la ventana', min: 6, esfuerzo: 2, impacto: 2, herramientas: ['trapo'], objeto: 'ventana' },
      { clave: 'barrer', verbo: 'limpiar', accion: 'Barré', descripcion: 'el piso', min: 5, esfuerzo: 2, impacto: 3, requiere: ['mesa-despejar', 'mantas', 'tele', 'mesa', 'estantes', 'ventana'], herramientas: ['escoba'], objeto: 'piso' },
      { clave: 'trapear', verbo: 'limpiar', accion: 'Trapeá', descripcion: 'el piso', min: 6, esfuerzo: 2, impacto: 3, requiere: ['barrer'], herramientas: ['trapo', 'balde'], objeto: 'piso' },
    ],
  },
  {
    id: 'bano',
    tipo: 'bano',
    nombre: 'Baño',
    ordenRecorrido: 4,
    objetos: [
      ['toallas', 'Toallas'],
      ['botiquin', 'Botiquín'],
      ['espejo', 'Espejo'],
      ['bacha', 'Bacha'],
      ['inodoro', 'Inodoro'],
      ['ducha', 'Ducha'],
      ['piso', 'Piso'],
    ],
    tareas: [
      { clave: 'ropa-sucia', verbo: 'guardar', accion: 'Juntá', descripcion: 'la ropa sucia', min: 2, esfuerzo: 1, impacto: 2, objeto: 'toallas' },
      { clave: 'toallas', verbo: 'guardar', accion: 'Colgá', descripcion: 'las toallas limpias', min: 2, esfuerzo: 1, impacto: 2, objeto: 'toallas' },
      { clave: 'botiquin', verbo: 'tirar', accion: 'Tirá', descripcion: 'lo vencido del botiquín', min: 4, esfuerzo: 1, impacto: 1, objeto: 'botiquin' },
      { clave: 'espejo', verbo: 'limpiar', accion: 'Limpiá', descripcion: 'el espejo', min: 3, esfuerzo: 1, impacto: 3, herramientas: ['trapo'], objeto: 'espejo' },
      { clave: 'bacha', verbo: 'limpiar', accion: 'Limpiá', descripcion: 'la bacha y la grifería', min: 5, esfuerzo: 2, impacto: 3, requiere: ['ropa-sucia'], herramientas: ['trapo', 'detergente'], objeto: 'bacha' },
      { clave: 'inodoro', verbo: 'limpiar', accion: 'Limpiá', descripcion: 'el inodoro', min: 6, esfuerzo: 3, impacto: 3, herramientas: ['trapo', 'detergente'], objeto: 'inodoro' },
      { clave: 'ducha', verbo: 'limpiar', accion: 'Limpiá', descripcion: 'la ducha', min: 8, esfuerzo: 3, impacto: 2, herramientas: ['trapo', 'detergente'], objeto: 'ducha' },
      { clave: 'barrer', verbo: 'limpiar', accion: 'Barré', descripcion: 'el piso', min: 3, esfuerzo: 2, impacto: 3, requiere: ['ropa-sucia', 'toallas', 'botiquin', 'espejo', 'bacha', 'inodoro', 'ducha'], herramientas: ['escoba'], objeto: 'piso' },
      { clave: 'trapear', verbo: 'limpiar', accion: 'Trapeá', descripcion: 'el piso', min: 4, esfuerzo: 2, impacto: 3, requiere: ['barrer'], herramientas: ['trapo', 'balde'], objeto: 'piso' },
    ],
  },
  {
    id: 'escritorio',
    tipo: 'escritorio',
    nombre: 'Escritorio',
    ordenRecorrido: 5,
    objetos: [
      ['escritorio', 'Escritorio'],
      ['papeles', 'Papeles'],
      ['cajones', 'Cajones'],
      ['pantalla', 'Pantalla'],
      ['cables', 'Cables'],
      ['piso', 'Piso'],
    ],
    tareas: [
      { clave: 'tazas', verbo: 'guardar', accion: 'Llevá', descripcion: 'las tazas y los vasos a la cocina', min: 2, esfuerzo: 1, impacto: 3, objeto: 'escritorio' },
      { clave: 'papelitos', verbo: 'tirar', accion: 'Tirá', descripcion: 'los papeles que no sirven', min: 3, esfuerzo: 1, impacto: 3, objeto: 'papeles' },
      { clave: 'pantalla', verbo: 'limpiar', accion: 'Limpiá', descripcion: 'la pantalla', min: 2, esfuerzo: 1, impacto: 1, herramientas: ['trapo'], objeto: 'pantalla' },
      { clave: 'clasificar', verbo: 'ordenar', accion: 'Ordená', descripcion: 'los papeles que hay que guardar', min: 8, esfuerzo: 2, impacto: 2, requiere: ['papelitos'], objeto: 'papeles' },
      { clave: 'superficie', verbo: 'limpiar', accion: 'Limpiá', descripcion: 'el escritorio', min: 4, esfuerzo: 2, impacto: 3, requiere: ['papelitos'], herramientas: ['trapo'], objeto: 'escritorio' },
      { clave: 'cables', verbo: 'ordenar', accion: 'Ordená', descripcion: 'los cables', min: 5, esfuerzo: 2, impacto: 1, objeto: 'cables' },
      { clave: 'cajones', verbo: 'ordenar', accion: 'Ordená', descripcion: 'los cajones', min: 10, esfuerzo: 3, impacto: 1, requiere: ['clasificar'], objeto: 'cajones' },
      { clave: 'barrer', verbo: 'limpiar', accion: 'Barré', descripcion: 'el piso', min: 3, esfuerzo: 2, impacto: 3, requiere: ['tazas', 'papelitos', 'pantalla', 'clasificar', 'superficie', 'cables', 'cajones'], herramientas: ['escoba'], objeto: 'piso' },
      { clave: 'trapear', verbo: 'limpiar', accion: 'Trapeá', descripcion: 'el piso', min: 4, esfuerzo: 2, impacto: 3, requiere: ['barrer'], herramientas: ['trapo', 'balde'], objeto: 'piso' },
    ],
  },
  {
    id: 'lavadero',
    tipo: 'lavadero',
    nombre: 'Lavadero',
    ordenRecorrido: 6,
    objetos: [
      ['tacho', 'Tacho'],
      ['detergentes', 'Detergentes'],
      ['pileta', 'Pileta'],
      ['lavarropas', 'Lavarropas'],
      ['tender', 'Tender'],
      ['piso', 'Piso'],
    ],
    tareas: [
      { clave: 'tacho', verbo: 'tirar', accion: 'Tirá', descripcion: 'la basura del tacho', min: 2, esfuerzo: 1, impacto: 2, objeto: 'tacho' },
      { clave: 'detergentes', verbo: 'ordenar', accion: 'Ordená', descripcion: 'los detergentes', min: 3, esfuerzo: 1, impacto: 2, objeto: 'detergentes' },
      { clave: 'pileta', verbo: 'limpiar', accion: 'Limpiá', descripcion: 'la pileta', min: 5, esfuerzo: 2, impacto: 3, herramientas: ['trapo', 'detergente'], objeto: 'pileta' },
      { clave: 'lavarropas', verbo: 'limpiar', accion: 'Limpiá', descripcion: 'el lavarropas por fuera', min: 4, esfuerzo: 2, impacto: 2, herramientas: ['trapo'], objeto: 'lavarropas' },
      { clave: 'filtro', verbo: 'limpiar', accion: 'Limpiá', descripcion: 'el filtro del lavarropas', min: 6, esfuerzo: 2, impacto: 1, requiere: ['lavarropas'], objeto: 'lavarropas' },
      { clave: 'tender', verbo: 'ordenar', accion: 'Ordená', descripcion: 'el tender', min: 4, esfuerzo: 1, impacto: 2, objeto: 'tender' },
      { clave: 'barrer', verbo: 'limpiar', accion: 'Barré', descripcion: 'el piso', min: 3, esfuerzo: 2, impacto: 3, requiere: ['tacho', 'detergentes', 'pileta', 'lavarropas', 'filtro', 'tender'], herramientas: ['escoba'], objeto: 'piso' },
      { clave: 'trapear', verbo: 'limpiar', accion: 'Trapeá', descripcion: 'el piso', min: 4, esfuerzo: 2, impacto: 3, requiere: ['barrer'], herramientas: ['trapo', 'balde'], objeto: 'piso' },
    ],
  },
  {
    id: 'balcon',
    tipo: 'balcon',
    nombre: 'Balcón',
    ordenRecorrido: 7,
    objetos: [
      ['macetas', 'Macetas'],
      ['sillas', 'Sillas'],
      ['parrilla', 'Parrilla'],
      ['baranda', 'Baranda'],
      ['piso', 'Piso'],
    ],
    tareas: [
      { clave: 'macetas', verbo: 'ordenar', accion: 'Acomodá', descripcion: 'las macetas', min: 2, esfuerzo: 1, impacto: 2, objeto: 'macetas' },
      { clave: 'basura', verbo: 'tirar', accion: 'Juntá', descripcion: 'lo que quedó tirado', min: 2, esfuerzo: 1, impacto: 3, objeto: 'piso' },
      { clave: 'sillas', verbo: 'limpiar', accion: 'Limpiá', descripcion: 'las sillas', min: 3, esfuerzo: 2, impacto: 2, herramientas: ['trapo'], objeto: 'sillas' },
      { clave: 'baranda', verbo: 'limpiar', accion: 'Limpiá', descripcion: 'la baranda', min: 4, esfuerzo: 2, impacto: 2, herramientas: ['trapo'], objeto: 'baranda' },
      { clave: 'parrilla', verbo: 'limpiar', accion: 'Limpiá', descripcion: 'la parrilla', min: 8, esfuerzo: 3, impacto: 1, herramientas: ['trapo', 'detergente'], objeto: 'parrilla' },
      // `basura` trabaja sobre el piso pero no lo limpia: es juntar lo tirado, y va primero.
      { clave: 'barrer', verbo: 'limpiar', accion: 'Barré', descripcion: 'el piso', min: 4, esfuerzo: 2, impacto: 3, requiere: ['macetas', 'sillas', 'baranda', 'parrilla', 'basura'], herramientas: ['escoba'], objeto: 'piso' },
      { clave: 'trapear', verbo: 'limpiar', accion: 'Trapeá', descripcion: 'el piso', min: 5, esfuerzo: 2, impacto: 3, requiere: ['barrer'], herramientas: ['trapo', 'balde'], objeto: 'piso' },
    ],
  },
  {
    id: 'garage',
    tipo: 'garage',
    nombre: 'Garage',
    ordenRecorrido: 8,
    objetos: [
      ['cajas', 'Cajas'],
      ['herramientas', 'Herramientas'],
      ['estantes', 'Estantes'],
      ['piso', 'Piso'],
    ],
    tareas: [
      { clave: 'cajas', verbo: 'ordenar', accion: 'Apilá', descripcion: 'las cajas', min: 2, esfuerzo: 1, impacto: 2, objeto: 'cajas' },
      { clave: 'basura', verbo: 'tirar', accion: 'Tirá', descripcion: 'lo que no sirve', min: 3, esfuerzo: 1, impacto: 3, objeto: 'cajas' },
      { clave: 'herramientas', verbo: 'ordenar', accion: 'Ordená', descripcion: 'las herramientas', min: 6, esfuerzo: 2, impacto: 2, objeto: 'herramientas' },
      { clave: 'estantes', verbo: 'ordenar', accion: 'Ordená', descripcion: 'los estantes', min: 8, esfuerzo: 3, impacto: 1, objeto: 'estantes' },
      { clave: 'barrer', verbo: 'limpiar', accion: 'Barré', descripcion: 'el piso', min: 6, esfuerzo: 2, impacto: 3, requiere: ['cajas', 'basura', 'herramientas', 'estantes'], herramientas: ['escoba'], objeto: 'piso' },
      { clave: 'trapear', verbo: 'limpiar', accion: 'Trapeá', descripcion: 'el piso', min: 7, esfuerzo: 2, impacto: 3, requiere: ['barrer'], herramientas: ['trapo', 'balde'], objeto: 'piso' },
    ],
  },
]

const idObjeto = (ambienteId: string, clave: string): string => `${ambienteId}-obj-${clave}`
const idTarea = (ambienteId: string, clave: string): string => `${ambienteId}-${clave}`

export const ambientes: Ambiente[] = DATOS.map((datos) => ({
  id: datos.id,
  hogarId: HOGAR_CATALOGO,
  tipo: datos.tipo,
  nombre: datos.nombre,
  ordenRecorrido: datos.ordenRecorrido,
  ultimaPuestaAlDia: null,
  vecesAlDia: 0,
}))

export const objetos: Objeto[] = DATOS.flatMap((datos) =>
  datos.objetos.map(([clave, nombre]) => ({
    id: idObjeto(datos.id, clave),
    ambienteId: datos.id,
    subAmbienteId: null,
    nombre,
  })),
)

export const tareas: Tarea[] = DATOS.flatMap((datos) =>
  datos.tareas.map((plana) => ({
    id: idTarea(datos.id, plana.clave),
    ambienteId: datos.id,
    subAmbienteId: null,
    objetoId: plana.objeto ? idObjeto(datos.id, plana.objeto) : null,
    verbo: plana.verbo,
    accion: plana.accion,
    descripcion: plana.descripcion,
    duracionMin: plana.min,
    esfuerzo: plana.esfuerzo,
    impactoVisual: plana.impacto,
    requiere: (plana.requiere ?? []).map((clave) => idTarea(datos.id, clave)),
    herramientas: plana.herramientas ?? [],
    esDelCatalogo: true,
    notas: null,
  })),
)
