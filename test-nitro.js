const { installWorkletsSupport } = require('./node_modules/react-native-nitro-modules/lib/commonjs/worklets/installWorkletsSupport');

try {
  installWorkletsSupport();
  console.log("Success");
} catch (e) {
  console.error("Error", e);
}
