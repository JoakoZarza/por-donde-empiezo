/*
  Que el navegador no borre los datos por su cuenta.

  Por defecto, lo que guarda una página en IndexedDB es «almacenamiento de mejor
  esfuerzo»: el navegador lo puede borrar si le falta espacio, y Safari en iOS lo
  borra a los siete días sin abrir el sitio. Este producto es de uso esporádico a
  propósito —se vuelve cuando hace falta—, así que sin esto la persona que vuelve
  después de dos semanas podía encontrar todo vacío: los ambientes, las tareas y
  los totales que la app promete que no bajan nunca.

  `navigator.storage.persist()` le pide al navegador que lo trate como datos de la
  persona y no como caché. No es garantía: Chrome lo concede según el uso o si la
  app está instalada, Firefox puede preguntar, y en iOS lo que realmente protege es
  instalar la app en la pantalla de inicio. Por eso, además de pedirlo, Ajustes dice
  cuándo no se consiguió.
*/

/** Pide almacenamiento persistente. Devuelve si quedó concedido. Nunca falla. */
export async function pedirAlmacenamientoPersistente(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

/** Si los datos están protegidos. Nulo si el navegador no permite saberlo. */
export async function almacenamientoEsPersistente(): Promise<boolean | null> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persisted) return null
    return await navigator.storage.persisted()
  } catch {
    return null
  }
}
