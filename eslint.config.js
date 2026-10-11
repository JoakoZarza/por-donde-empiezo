import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import jsxA11y from 'eslint-plugin-jsx-a11y'

// La prohibición de `transition: all` NO se controla acá: ESLint no lee CSS.
// La controla el test de contrato de estilos, que lee los archivos reales.
// Ver la decisión en el ledger del plan.
export default tseslint.config(
  { ignores: ['dist', 'node_modules', '.pnpm-store', 'coverage', '.superpowers'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
)
