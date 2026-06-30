# React Widget

A React widget using the ESM module pattern.

## External Dependencies

This widget externalizes React and loads it at runtime from [esm.sh](https://esm.sh). Vite is configured to treat `react`, `react-dom`, `react/jsx-runtime`, and `react-dom/client` as external dependencies (see `vite.config.ts`), so they are **not** bundled into the build output.

These dependencies are resolved at runtime via an import map that must be provided **globally** by the Community Control panel (e.g. via Third Party Scripts). The widget itself does not ship any import map — it expects bare specifiers like `"react"` to already be mapped by the host page.

### Import Map (added once in CC Third Party Scripts)

The following snippet needs to be added **once** in the Community Control panel's Third Party Scripts section. It covers all widgets that depend on React:

```html
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@19.2.0",
    "react/jsx-runtime": "https://esm.sh/react@19.2.0/jsx-runtime",
    "react-dom/client": "https://esm.sh/react-dom@19.2.0/client"
  }
}
</script>

<link rel="modulepreload" href="https://esm.sh/react@19.2.0">
<link rel="modulepreload" href="https://esm.sh/react@19.2.0/jsx-runtime">
<link rel="modulepreload" href="https://esm.sh/react-dom@19.2.0/client">
```

The `<link rel="modulepreload">` tags tell the browser to start fetching React modules early, improving load performance.

## Development

```bash
yarn install
yarn dev
```

## Build

```bash
yarn build
```

The build output lands in `dist/` — a JS bundle (`widget.js`), a CSS file (`widget.css`), and an `index.html` that references them. The import map is expected to already be present on the page.
