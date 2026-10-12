/*
  Orden ascendente por código, no por idioma.

  `localeCompare` ordena según la configuración regional del dispositivo: la misma
  biblioteca de tareas podría producir planes distintos en dos teléfonos con idiomas
  distintos, y la garantía de determinismo del motor no puede depender de eso. Por
  eso el desempate final se hace comparando los caracteres.

  El desempate importa más de lo que parece: es lo último que decide cuando dos
  tareas o dos ambientes empatan en todo lo demás, y sin él el orden dependería del
  orden en que el navegador devolvió las filas.
*/
export function comparar(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}
