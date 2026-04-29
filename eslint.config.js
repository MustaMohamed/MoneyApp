// eslint-config-expo uses flat config; we extend it and add prettier to disable conflicting rules.
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  ...expoConfig,
  prettierConfig,
  {
    ignores: ['node_modules/', '.expo/', 'dist/', 'web-build/', 'android/', 'ios/'],
  },
];
