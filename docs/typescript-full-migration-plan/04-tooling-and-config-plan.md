# Tooling And Config Plan

## Package changes

Add dev dependencies for:

- `vite`
- `typescript`
- optionally `@types/node` only if config files require it

Keep `@playwright/test`.

Possible scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --host 127.0.0.1 --port 4173",
    "typecheck": "tsc --noEmit",
    "test:e2e": "playwright test",
    "test:e2e:full": "PW_INCLUDE_WEBKIT=1 playwright test"
  }
}
```

## Vite plan

Use Vite for:

- local dev server
- production build
- preview server for E2E if preferred

Expected benefits:

- native ESM dev flow
- easier TypeScript entrypoint
- cleaner future asset handling
- simpler migration than custom bundler setup

Suggested minimal setup:

- keep `index.html` at repo root
- load `/src/main.ts`
- keep static assets near root or move deliberately later

## TypeScript config plan

Start conservative, tighten later.

Suggested initial `tsconfig.json` direction:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "noEmit": true,
    "isolatedModules": true,
    "useDefineForClassFields": true,
    "allowJs": true,
    "checkJs": false,
    "strict": false,
    "types": []
  },
  "include": ["src", "tests", "vite.config.ts", "playwright.config.ts"]
}
```

Then tighten over time:

- remove `allowJs`
- enable `strict`
- add more strictness flags as migration stabilizes

## Vite config plan

Need little or no custom config initially.

Only add config when repo-specific need appears, such as:

- fixed preview host/port for Playwright
- asset handling conventions
- base path for deployment

Avoid premature plugin sprawl.

## Playwright plan

Current config serves app through `python3 -m http.server`.

Change to one of these:

1. `vite preview` for production-like validation.
2. `vite` dev server for faster iteration.

Recommended split:

- local refactor loop: point tests at Vite dev server
- release confidence: optionally run against `vite preview`

## Config file migration order

1. `tsconfig.json`
2. optionally `vite.config.ts`
3. convert `playwright.config.js` -> `playwright.config.ts`
4. convert tests `.js` -> `.ts`

## Linting

Optional, not required for migration.

If added, add after TypeScript migration stabilizes. Otherwise lint setup becomes side quest.

## Directory plan

Target root after migration:

```text
.
  index.html
  index.css
  package.json
  tsconfig.json
  vite.config.ts
  playwright.config.ts
  src/
  tests/
  docs/
```

If styles later split into modules, make that separate plan. No need during first TS cutover.
