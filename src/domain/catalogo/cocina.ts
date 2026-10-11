import { HOGAR_CATALOGO } from '../tipos'
import type { Ambiente, Objeto, Tarea } from '../tipos'

/*
  El catálogo de la cocina. Es el ambiente de referencia: la idea original lo
  describió con más detalle que ningún otro, y sirve de patrón para los siete
  restantes.

  Dos reglas de la sección 5.4 que el validador NO puede comprobar quedan
  codificadas acá a mano, en las dependencias:
    - Arriba antes que abajo: el piso se barre después de despejar la mesada.
    - Sacar antes que limpiar: nada se limpia antes de sacar lo que lo tapa
      (los platos antes de la mesada, lo vencido antes de la heladera).
*/

export const ambienteCocina: Ambiente = {
  id: 'cocina',
  hogarId: HOGAR_CATALOGO,
  tipo: 'cocina',
  nombre: 'Cocina',
  ordenRecorrido: 3,
  ultimaPuestaAlDia: null,
  vecesAlDia: 0,
}

function objeto(id: string, nombre: string): Objeto {
  return { id, ambienteId: ambienteCocina.id, subAmbienteId: null, nombre }
}

export const objetosCocina: Objeto[] = [
  objeto('cocina-obj-mesada', 'Mesada'),
  objeto('cocina-obj-bachas', 'Bachas'),
  objeto('cocina-obj-hornallas', 'Hornallas'),
  objeto('cocina-obj-heladera', 'Heladera'),
  objeto('cocina-obj-alacena', 'Alacena'),
  objeto('cocina-obj-mesa', 'Mesa'),
  objeto('cocina-obj-tacho', 'Tacho de basura'),
  objeto('cocina-obj-piso', 'Piso'),
]

function tarea(parcial: Partial<Tarea> & Pick<Tarea, 'id' | 'accion' | 'descripcion' | 'duracionMin'>): Tarea {
  return {
    ambienteId: ambienteCocina.id,
    subAmbienteId: null,
    objetoId: null,
    verbo: 'limpiar',
    esfuerzo: 1,
    impactoVisual: 1,
    requiere: [],
    herramientas: [],
    esDelCatalogo: true,
    notas: null,
    ...parcial,
  }
}

export const tareasCocina: Tarea[] = [
  // Arranques de dos minutos: no dependen de nada y están entre lo que más se nota.
  tarea({
    id: 'cocina-tirar-basura',
    verbo: 'tirar',
    accion: 'Tirá',
    descripcion: 'la basura',
    duracionMin: 2,
    esfuerzo: 1,
    impactoVisual: 2,
    objetoId: 'cocina-obj-tacho',
  }),
  tarea({
    id: 'cocina-guardar-platos',
    verbo: 'guardar',
    accion: 'Guardá',
    descripcion: 'los platos limpios del secadero',
    duracionMin: 2,
    esfuerzo: 1,
    impactoVisual: 2,
    objetoId: 'cocina-obj-bachas',
  }),

  // Sacar antes que limpiar: los platos primero, la mesada después.
  tarea({
    id: 'cocina-lavar-platos',
    verbo: 'lavar',
    accion: 'Lavá',
    descripcion: 'los platos y las ollas',
    duracionMin: 10,
    esfuerzo: 2,
    impactoVisual: 3,
    requiere: ['cocina-guardar-platos'],
    herramientas: ['detergente'],
    objetoId: 'cocina-obj-bachas',
  }),
  tarea({
    id: 'cocina-mesada-despejar',
    verbo: 'guardar',
    accion: 'Despejá',
    descripcion: 'la mesada',
    duracionMin: 3,
    esfuerzo: 1,
    impactoVisual: 3,
    objetoId: 'cocina-obj-mesada',
  }),

  // Arriba antes que abajo: las superficies elevadas antes que el piso.
  tarea({
    id: 'cocina-hornallas',
    verbo: 'limpiar',
    accion: 'Limpiá',
    descripcion: 'las hornallas',
    duracionMin: 6,
    esfuerzo: 3,
    impactoVisual: 2,
    requiere: ['cocina-mesada-despejar'],
    herramientas: ['trapo'],
    objetoId: 'cocina-obj-hornallas',
  }),
  tarea({
    id: 'cocina-mesada',
    verbo: 'limpiar',
    accion: 'Limpiá',
    descripcion: 'la mesada',
    duracionMin: 4,
    esfuerzo: 2,
    impactoVisual: 3,
    requiere: ['cocina-mesada-despejar', 'cocina-lavar-platos'],
    herramientas: ['trapo'],
    objetoId: 'cocina-obj-mesada',
  }),
  tarea({
    id: 'cocina-mesa',
    verbo: 'limpiar',
    accion: 'Limpiá',
    descripcion: 'la mesa',
    duracionMin: 3,
    esfuerzo: 2,
    impactoVisual: 2,
    herramientas: ['trapo'],
    objetoId: 'cocina-obj-mesa',
  }),
  tarea({
    id: 'cocina-alacena',
    verbo: 'ordenar',
    accion: 'Ordená',
    descripcion: 'la alacena',
    duracionMin: 7,
    esfuerzo: 2,
    impactoVisual: 1,
    objetoId: 'cocina-obj-alacena',
  }),
  tarea({
    id: 'cocina-heladera',
    verbo: 'tirar',
    accion: 'Tirá',
    descripcion: 'lo vencido de la heladera',
    duracionMin: 4,
    esfuerzo: 2,
    impactoVisual: 1,
    objetoId: 'cocina-obj-heladera',
  }),
  tarea({
    id: 'cocina-heladera-limpia',
    verbo: 'limpiar',
    accion: 'Limpiá',
    descripcion: 'la heladera',
    duracionMin: 6,
    esfuerzo: 2,
    impactoVisual: 1,
    requiere: ['cocina-heladera'],
    herramientas: ['trapo'],
    objetoId: 'cocina-obj-heladera',
  }),

  // El piso, al final y en orden: seco antes que húmedo.
  tarea({
    id: 'cocina-barrer',
    verbo: 'limpiar',
    accion: 'Barré',
    descripcion: 'el piso',
    duracionMin: 5,
    esfuerzo: 2,
    impactoVisual: 3,
    // Arriba antes que abajo: el piso va último, después de todo lo que se
    // trabaja sobre una superficie elevada. Sin estas dependencias, el plan
    // barría y trapeaba antes de limpiar las hornallas y lavar los platos.
    requiere: [
      'cocina-tirar-basura',
      'cocina-guardar-platos',
      'cocina-lavar-platos',
      'cocina-mesada-despejar',
      'cocina-hornallas',
      'cocina-mesada',
      'cocina-mesa',
      'cocina-alacena',
      'cocina-heladera',
      'cocina-heladera-limpia',
    ],
    herramientas: ['escoba'],
    objetoId: 'cocina-obj-piso',
  }),
  tarea({
    id: 'cocina-trapear',
    verbo: 'limpiar',
    accion: 'Trapeá',
    descripcion: 'el piso',
    duracionMin: 6,
    esfuerzo: 2,
    impactoVisual: 3,
    requiere: ['cocina-barrer'],
    herramientas: ['trapo', 'balde'],
    objetoId: 'cocina-obj-piso',
  }),
]
