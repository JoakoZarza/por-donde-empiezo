/*
  Identificadores.

  `crypto.randomUUID()` existe SOLO en contextos seguros: HTTPS, `localhost` o un
  archivo local. Servida por HTTP en la red local —que es como se prueba en un
  teléfono— la función no existe, y llamarla tira un error que dejaba a la persona
  sin poder armar el plan.

  Los tests no lo vieron porque Node sí tiene `crypto.randomUUID`. Es un defecto que
  solo el despliegue real podía mostrar.

  `crypto.getRandomValues`, en cambio, sí está disponible sin contexto seguro, así
  que sirve de respaldo con la misma calidad de aleatoriedad.
*/

export function nuevoId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
