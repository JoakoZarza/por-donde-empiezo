import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // El manifiesto es propio y vive en public/: así se puede revisar y testear.
      manifest: false,
      includeAssets: ['iconos/*.png', 'manifest.webmanifest'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,webmanifest,woff2}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    /*
      El mismo techo que las esperas de Testing Library en `src/test/setup.ts`. Con
      los 5 s por defecto, un test se cortaba antes de que sus propias esperas se
      rindieran: los flujos largos, que solos tardan menos de un segundo, fallaban
      por reloj cuando la suite entera corría en paralelo.
    */
    testTimeout: 15000,
  },
})
