# Por Dónde Empiezo

[![CI](https://github.com/JoakoZarza/por-donde-empiezo/actions/workflows/ci.yml/badge.svg)](https://github.com/JoakoZarza/por-donde-empiezo/actions/workflows/ci.yml)

Aplicación web progresiva (PWA) *mobile-first* que ayuda a personas abrumadas por el desorden doméstico a empezar a limpiar con un paso a la vez.

<!-- ![Pantalla principal](docs/capturas/plan.png) -->
<!-- ![Armado de tareas](docs/capturas/02-armado.png) -->
<!-- ![Plano de la casa](docs/capturas/05-casa.png) -->

## Qué resuelve

Ordenar y mantener una casa rara vez falla por falta de capacidad: falla por la parálisis cognitiva de no saber por dónde empezar. Mirar todo junto abruma, agota antes de arrancar y termina en postergación, especialmente en personas que conviven con cansancio, TDAH, depresión o sobrecarga cotidiana.

**Por Dónde Empiezo** convierte esa indecisión en una sola tarea concreta en pantalla. El plan garantiza un primer paso de **≤ 2 minutos** para romper la inercia sin fricción, y encadena el trabajo respetando el tiempo disponible y las dependencias físicas reales de la limpieza doméstica (seco antes que húmedo, arriba antes que abajo).

A diferencia de los gestores de tareas tradicionales, la app es **offline-first**, funciona de inmediato sin exigir registro y aplica un diseño ético: ningún indicador baja por no usarla, no hay rachas rotas, no hay números en rojo ni reclamos de culpa.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend** | React 19 + TypeScript |
| **Bundler & Tooling** | Vite |
| **Deploy** | Vercel |
| **Estado global** | Zustand |
| **Persistencia local** | Dexie (IndexedDB) |
| **Estilos & Diseño** | Tailwind CSS 4 + Tokens CSS («Luz de velador») |
| **PWA & Offline** | `vite-plugin-pwa` con Workbox |
| **Testing** | Vitest + React Testing Library (247 tests) |
| **IA (Opcional)** | Google Gemini (`gemini-2.0-flash`, client-side con API key personal) |

## Cómo correrlo localmente

Requisitos: Node.js 22+ y npm.

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

## Cómo correr los tests

El proyecto cuenta con una batería integral de pruebas unitarias, de integración, de accesibilidad y de contratos de estilo:

```bash
# Correr suite de tests (30 archivos, 247 tests)
npm test

# Correr linter (ESLint con reglas de accesibilidad)
npm run lint

# Verificación de tipos TypeScript y build de producción
npm run build
```

## Demo en vivo

- Demo: [https://por-donde-empiezo.vercel.app/](https://por-donde-empiezo.vercel.app/)

## Decisiones de diseño y arquitectura

- **Dominio puro y determinístico:** Toda la lógica central (`src/domain/`) no importa React, red ni reloj del sistema. Funciones matemáticas libres de efectos secundarios donde `Date.now()` o `Math.random()` están prohibidos, garantizando que una misma entrada genere exactamente el mismo plan.
- **Garantías formales comprobables:** El motor asegura formalmente seis invariantes (G1 a G6) validadas por tests automáticos: primer paso ≤ 2 minutos, resolución acíclica de dependencias, desempates reproducibles y adaptación estricta al presupuesto de tiempo.
- **Offline-first sin fricción:** La aplicación es 100% operativa sin conexión y sin backend. Todos los datos se guardan en IndexedDB y pueden migrarse entre dispositivos mediante un archivo de respaldo JSON local.
- **Diseño ético («Sin culpa»):** Los contadores de esfuerzo solo crecen; la ausencia nunca se muestra como deuda ni penalización. La interfaz respeta safe-areas para dispositivos móviles, áreas táctiles ≥ 44 px y contraste accesible bajo estándares WCAG AA.

## Roadmap

- Sincronización multi-dispositivo.
- Historial cronológico de sesiones.
- Comparación fotográfica antes/después.
