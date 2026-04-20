# WheelSpin

WheelSpin is browser-native random picker built with HTML, CSS, TypeScript, and Canvas.

## Workflow

Install deps:

```bash
npm install
```

Run local dev server:

```bash
npm run dev
```

Build production output:

```bash
npm run build
```

Preview built app:

```bash
npm run preview
```

Type-check app and tests:

```bash
npm run typecheck
```

Run Playwright smoke tests:

```bash
npm run test:e2e
```

## Architecture

- `index.html` loads Vite entrypoint at `/src/main.ts`.
- App runtime lives under `src/` as small TypeScript modules.
- `index.css` keeps global styling and design tokens.
- `tests/` holds Playwright smoke coverage.

Module boundary rules:

- Keep DOM querying centralized in `src/dom.ts`.
- Keep shared mutable app state in `src/state.ts`.
- Keep pure helpers under `src/lib/`.
- Extend existing focused modules instead of rebuilding giant bootstrap file.

## Deployment

- `npm run build` outputs production site to `dist/`.
- Build also copies static root assets into `dist/`: `robots.txt`, `sitemap.xml`, `favicon.svg`, and Open Graph images.
- Netlify should publish `dist/`.

## Verification

- `npm run typecheck`
- `npm run build`
- `npm run test:e2e`
- Manual browser check for canvas rendering, normal-motion spin, dark mode, forced-colors, and audio/mute persistence.
