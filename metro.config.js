const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 让 Metro 把分割模型（.onnx）当作静态资源打包
const assetExts = config.resolver?.assetExts ?? config.transformer?.assetExts;
if (assetExts && !assetExts.includes('onnx')) {
  assetExts.push('onnx');
}

module.exports = config;
