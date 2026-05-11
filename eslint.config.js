// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*'],
  },
  {
    files: ['tailwind.config.js'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Property[key.name='colors'] Literal[value=/^#[0-9a-fA-F]{3,8}$/]",
          message:
            'Hardcoded hex in tailwind.config.js is banned. Import values from constants/theme_tokens.ts.',
        },
      ],
    },
  },
]);
