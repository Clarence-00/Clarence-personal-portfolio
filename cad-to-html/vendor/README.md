# Vendored three.js

`three.bundle.min.js` is three.js **r170 (0.170.0)** plus `OrbitControls` and `GLTFLoader`,
bundled into one classic script that defines `window.THREE`. It is inlined into every
generated HTML file, so viewers work offline from `file://` with no CDN or server.

License: MIT (see `LICENSE-three.txt`).

To rebuild (needs Node.js; only necessary to upgrade three.js):

```bash
mkdir /tmp/three-bundle && cd /tmp/three-bundle
npm init -y && npm i three@0.170.0 esbuild@0.24.0
cp /path/to/cad-to-html/vendor/three-entry.js .
npx esbuild three-entry.js --bundle --minify --format=iife --legal-comments=none \
    --outfile=/path/to/cad-to-html/vendor/three.bundle.min.js
```
