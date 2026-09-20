import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

/** Flat config — eslint-config-next 16 ships native flat configs. */
const config = [
  { ignores: ['.next/**', 'node_modules/**', 'docs/**', 'next-env.d.ts', 'scripts/**'] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Keeps `any` out of the domain layer.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
]

export default config
