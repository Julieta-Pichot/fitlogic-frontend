import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Antes solo se analizaban .js/.jsx, y el proyecto es TypeScript: el lint no revisaba nada.
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Se reporta, pero no corta el flujo: hay deuda previa de imports sin usar y tipos any en servicios viejos.
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-refresh/only-export-components': 'warn',
      // Patrón existente (precargar estado en un efecto): se reporta como aviso, no como error.
      'react-hooks/set-state-in-effect': 'warn',
      // Patrón existente (precargar estado en un efecto): se reporta como aviso, no como error.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])
