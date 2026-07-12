---
name: expo-sqlite web setup
description: How to make expo-sqlite v14+ work on the Expo web preview in Replit
---

## Rule
Two things must both be in `metro.config.js` for expo-sqlite to work on web:

1. Add `'wasm'` to `config.resolver.assetExts` — so Metro can serve the `wa-sqlite.wasm` binary.
2. Add `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` response headers via `config.server.enhanceMiddleware` — so `SharedArrayBuffer` is available in the browser.

**Why:** expo-sqlite's web implementation uses WebAssembly (wa-sqlite) with a SharedArrayBuffer-based worker. Without both steps: the .wasm file can't be resolved (Metro error) and even if resolved, SharedArrayBuffer is blocked by browser cross-origin policy, causing the DB to never initialize (infinite loading screen).

**How to apply:** Any Expo project that uses expo-sqlite and needs a working web/browser preview. Not needed for native-only builds (Android APK / iOS IPA).

## Working metro.config.js

```js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');

const orig = config.server?.enhanceMiddleware;
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    const enhanced = orig ? orig(middleware) : middleware;
    return (req, res, next) => {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      enhanced(req, res, next);
    };
  },
};

module.exports = config;
```
