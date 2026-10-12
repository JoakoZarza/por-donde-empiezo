/*
  El único lugar de la app que habla por la red.

  Es la frontera impura, como el reloj: el dominio arma el pedido y lee la respuesta,
  y esto se ocupa de que el pedido llegue y de traducir lo que salga mal a algo que
  una persona pueda entender.

  Se eligió Gemini porque tiene un plan gratuito de verdad y entiende fotos y texto
  en el mismo pedido. La clave es de quien usa la app, y viaja solo acá.
*/

const MODELO = 'gemini-2.0-flash'
const ESPERA_MAXIMA_MS = 45_000

export class FalloDeIa extends Error {}

function direccion(): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`
}

interface ParteDelPedido {
  text?: string
  inline_data?: { mime_type: string; data: string }
}

export interface PedidoDeIa {
  clave: string
  texto: string
  /** La foto ya convertida a base64, sin el encabezado `data:`. */
  imagen: { tipo: string; base64: string } | null
}

export async function consultarIa(pedido: PedidoDeIa): Promise<string> {
  const partes: ParteDelPedido[] = [{ text: pedido.texto }]
  if (pedido.imagen) {
    partes.push({ inline_data: { mime_type: pedido.imagen.tipo, data: pedido.imagen.base64 } })
  }

  // Sin límite de espera, una red mala deja la pantalla girando para siempre.
  const reloj = new AbortController()
  const corte = setTimeout(() => reloj.abort(), ESPERA_MAXIMA_MS)

  let respuesta: Response
  try {
    respuesta = await fetch(direccion(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': pedido.clave },
      body: JSON.stringify({ contents: [{ parts: partes }] }),
      signal: reloj.signal,
    })
  } catch {
    // Nunca se incluye la clave ni la dirección en el mensaje: podría quedar en un
    // registro del navegador o en una captura de pantalla.
    throw new FalloDeIa('No pudimos llegar al servicio de IA. Fijate tu conexión y probá de nuevo.')
  } finally {
    clearTimeout(corte)
  }

  if (!respuesta.ok) {
    if (respuesta.status === 400 || respuesta.status === 401 || respuesta.status === 403) {
      throw new FalloDeIa('La clave no sirve, o no tiene permiso para este modelo.')
    }
    if (respuesta.status === 429) {
      throw new FalloDeIa('Se acabó la cuota gratuita por ahora. Probá de nuevo en un rato.')
    }
    throw new FalloDeIa('El servicio de IA contestó con un problema. Probá de nuevo.')
  }

  const datos = (await respuesta.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }

  const texto = (datos.candidates?.[0]?.content?.parts ?? [])
    .map((parte) => parte.text ?? '')
    .join('')
    .trim()

  if (texto === '') throw new FalloDeIa('La IA no devolvió nada. Probá de nuevo.')

  return texto
}

/** Convierte una foto elegida a lo que espera el servicio. */
export async function leerImagen(archivo: File): Promise<{ tipo: string; base64: string }> {
  const datos = await archivo.arrayBuffer()
  let binario = ''
  const bytes = new Uint8Array(datos)
  // Por bloques: `String.fromCharCode(...todos)` revienta con una foto de celular.
  for (let indice = 0; indice < bytes.length; indice += 8192) {
    binario += String.fromCharCode(...bytes.subarray(indice, indice + 8192))
  }
  return { tipo: archivo.type || 'image/jpeg', base64: btoa(binario) }
}
