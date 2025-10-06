const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const { withNativeWind } = require("nativewind/metro");
/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */

const config = mergeConfig(getDefaultConfig(__dirname), {
  transformer: {
    minifierConfig: {
      mangle: {
        keep_fnames: true,
      },
      output: {
        ascii_only: true,
        quote_style: 3,
        wrap_iife: true,
      },
      sourceMap: false,
      toplevel: false,
      warnings: false,
      parse: {
        bare_returns: false,
      },
    },
  },
  resolver: {
    alias: {
      'react-native-vector-icons': 'react-native-vector-icons',
    },
  },
});
 
module.exports = withNativeWind(config, { input: "./global.css" });