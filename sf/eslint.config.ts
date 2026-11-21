import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import type { Linter } from 'eslint';
import globals from 'globals';
const config: Linter.Config[] = [
  {
    ignores: [
      'node_modules/**',
      '.build/**',
      'server/node_modules/**',
      'world-cache/**',
      'server/deploy/.terraform/**',
      'explore.js.map',
      'bundle-meta.json',
      'content/validate.js',
      'tools/animation-audit.js',
      'tools/character-gpu-audit.js',
    ],
  },
  {
    files: ['**/*.ts', '**/*.mts'],
    plugins: {
      '@typescript-eslint': tsPlugin as unknown as NonNullable<Linter.Config['plugins']>[string],
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { disallowTypeAnnotations: false }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'none',
          caughtErrors: 'none',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      'no-unreachable': 'error',
      'no-duplicate-imports': ['error', { allowSeparateTypeImports: true }],
    },
  },
];

export default config;
