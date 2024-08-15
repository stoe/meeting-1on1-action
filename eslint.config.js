import globals from 'globals'
import markdown from 'eslint-plugin-markdown'
import prettierConfig from 'eslint-config-prettier'
import prettierPluginRecommended from 'eslint-plugin-prettier/recommended'

const ignores = ['build/**', 'cache/**', 'coverage/**', 'dist/**', 'node_modules/**']

export default [
  prettierConfig,
  prettierPluginRecommended,
  {
    files: ['action.js', 'lib/**/*.js'],
    ignores,
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {ecmaVersion: 'latest', sourceType: 'module'},
    },
    plugins: {markdown},
    rules: {
      'prettier/prettier': 'error',
    },
  },
  ...markdown.configs.recommended,
  {
    files: ['**/*.md'],
    ignores,
    processor: 'markdown/markdown',
  },
  {
    files: ['**/*.md/*.js'],
    ignores,
    rules: {},
  },
]
