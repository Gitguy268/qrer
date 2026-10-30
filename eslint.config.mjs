import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['assets/vendor/**', 'node_modules/**', 'test-results/**'] },
  js.configs.recommended,
  {
    files: ['assets/**/*.js', 'register-sw.js'],
    languageOptions: { globals: globals.browser },
  },
  { files: ['sw.js'], languageOptions: { globals: globals.serviceworker } },
  {
    files: ['scripts/**/*.mjs', '*.config.mjs', 'tests/unit/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['tests/*.cjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      eqeqeq: 'error',
      'no-var': 'error',
    },
  },
];
