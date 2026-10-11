import { existsSync, readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

/*
  La app tiene que poder instalarse en el teléfono y abrirse sin conexión: es una
  PWA, y ese es el motivo por el que no hay tiendas de aplicaciones de por medio.

  El test verifica el contrato del manifiesto y del HTML, no que el service worker
  funcione: eso se comprueba en un teléfono real, con el modo avión.
*/

const leer = (ruta: string): string => (existsSync(ruta) ? readFileSync(ruta, 'utf8') : '')

test('el manifiesto tiene lo mínimo para instalarse', () => {
  const manifiesto = JSON.parse(leer('public/manifest.webmanifest') || '{}') as {
    name?: string
    short_name?: string
    start_url?: string
    display?: string
    background_color?: string
    theme_color?: string
    lang?: string
    icons?: { sizes: string; purpose?: string }[]
  }

  expect(manifiesto.name).toBe('Por dónde empiezo')
  expect(manifiesto.short_name).toBeTruthy()
  expect(manifiesto.start_url).toBe('/')
  expect(manifiesto.display).toBe('standalone')
  expect(manifiesto.lang).toBe('es-AR')
  // El fondo del manifiesto es el mismo de la app: si no, al abrir parpadea en blanco.
  expect(manifiesto.background_color).toBe('#171633')
  expect(manifiesto.theme_color).toBe('#171633')

  const tamanos = (manifiesto.icons ?? []).map((icono) => icono.sizes)
  expect(tamanos).toContain('192x192')
  expect(tamanos).toContain('512x512')
  expect((manifiesto.icons ?? []).some((icono) => icono.purpose === 'maskable')).toBe(true)
})

test('los íconos que el manifiesto declara existen de verdad', () => {
  expect(existsSync('public/iconos/icono-192.png')).toBe(true)
  expect(existsSync('public/iconos/icono-512.png')).toBe(true)
  expect(existsSync('public/iconos/icono-maskable-512.png')).toBe(true)
})

test('el html alinea el color del navegador, respeta el notch y no deshabilita el zoom', () => {
  const html = leer('index.html')
  expect(html).toMatch(/<meta name="theme-color" content="#171633"/)
  expect(html).toMatch(/viewport-fit=cover/)
  expect(html).toMatch(/<link rel="manifest"/)
  expect(html).not.toMatch(/maximum-scale|user-scalable\s*=\s*no/)
})
