# Build Instructions — Wisphub Yaa Companion v1.1.0

## System Requirements

- **OS:** Windows 10+, macOS 12+, or Linux (Ubuntu 20.04+)
- **Node.js:** >= 18 (tested with v22.x)
- **npm:** >= 9 (bundled with Node.js)

## Step-by-step Build

1. **Clone the repository:**

   ```sh
   git clone https://github.com/JohnyDeCoder/wisphub-yaa-companion.git
   cd wisphub-yaa-companion
   ```

2. **Checkout the release tag:**

   ```sh
   git checkout v1.1.0
   ```

3. **Install dependencies:**

   ```sh
   npm install
   ```

4. **Build for Firefox:**

   ```sh
   npm run build:firefox
   ```

5. **Output:** The built extension is in `dist/firefox/`. This directory contains the exact same code as the submitted `.zip` file.

## Dependencies

All dependencies are listed in `package.json` and installed via `npm install`:

| Package               | Purpose                               |
| --------------------- | ------------------------------------- |
| webpack               | Module bundler                        |
| webpack-cli           | CLI for webpack                       |
| copy-webpack-plugin   | Copies static assets to dist          |
| terser-webpack-plugin | JavaScript minifier (production only) |
| css-loader            | Resolves CSS imports                  |
| style-loader          | Injects CSS into the page             |
| eslint                | Code linting (dev only, not in build) |

No third-party runtime libraries are used. The extension is 100% vanilla JavaScript (ES Modules).

## Source Code Structure

```
src/
├── config/       # Constants, allowed domains, messages
├── utils/        # Reusable utilities (logger, DOM helpers)
├── lib/          # Intermediate layers (editor, messaging, storage)
├── features/     # Independent feature modules
├── styles/       # CSS (variables + injected styles)
└── app/          # Entry points (page.js, content.js, background.js, popup/)
```

## Notes

- No transpilation (no Babel, no TypeScript). Source is plain ES2020+ JavaScript.
- Webpack only bundles modules and minifies in production. No code transformation.
- The `manifest.json` transform in webpack only adjusts the `background` key for Firefox compatibility (`service_worker` → `scripts`).
