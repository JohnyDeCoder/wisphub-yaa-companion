import js from '@eslint/js';
import globals from 'globals';
import boundaries from 'eslint-plugin-boundaries';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'example/**', 'scripts/**', 'webpack.config.js'],
  },
  js.configs.recommended,
  {
    plugins: { boundaries },
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        CKEDITOR: 'readonly',
        chrome: 'readonly',
        browser: 'readonly',
      },
    },
    settings: {
      'boundaries/elements': [
        { type: 'config', pattern: 'src/config/*' },
        { type: 'utils', pattern: 'src/utils/*' },
        { type: 'lib', pattern: 'src/lib/**/*' },
        { type: 'features', pattern: 'src/features/**/*' },
        { type: 'app', pattern: 'src/app/**/*' },
        { type: 'styles', pattern: 'src/styles/*' },
      ],
      'boundaries/dependency-nodes': ['import'],
    },
    rules: {
      semi: ['error', 'always'],
      quotes: ['error', 'single'],
      'brace-style': ['error', '1tbs', { allowSingleLine: true }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'max-len': ['warn', { code: 120, tabWidth: 2, ignoreUrls: true }],
      'no-unused-vars': ['warn'],
      'no-console': 'off',
      indent: ['error', 2],
      'comma-dangle': ['error', 'always-multiline'],
      curly: ['error', 'all'],
      'no-var': 'error',
      'prefer-const': 'error',

      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'config', allow: [] },
            { from: 'utils', allow: ['config'] },
            { from: 'lib', allow: ['config', 'utils'] },
            { from: 'features', allow: ['config', 'utils', 'lib'] },
            { from: 'app', allow: ['config', 'utils', 'lib', 'features'] },
          ],
        },
      ],
    },
  },
];
