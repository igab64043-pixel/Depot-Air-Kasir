const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Tambahkan .wasm ke assetExts agar expo-sqlite bisa dimuat di web
config.resolver.assetExts.push('wasm');

// Tambahkan COOP/COEP headers agar SharedArrayBuffer tersedia di browser
// (dibutuhkan expo-sqlite WebAssembly)
const originalEnhanceMiddleware = config.server?.enhanceMiddleware;
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    const enhanced = originalEnhanceMiddleware
      ? originalEnhanceMiddleware(middleware)
      : middleware;
    return (req, res, next) => {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      enhanced(req, res, next);
    };
  },
};

module.exports = config;
