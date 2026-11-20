import globals from 'globals';
export default [
  {
    ignores: [
      'node_modules/**',
      'server/node_modules/**',
      'world-cache/**',
      'server/deploy/.terraform/**',
      'explore.js.map',
      'bundle-meta.json',
    ],
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': [
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
      'no-duplicate-imports': 'error',
    },
  },
];
