const mobxReactObserverPlugin = require('mobx-react-observer/babel-plugin').default;

/**
 * @param {{ cache: (enabled: boolean) => void }} api
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module:@preact/signals-react-transform', { mode: 'manual' }],
      mobxReactObserverPlugin(),
      'react-native-worklets/plugin',
    ],
  };
};
