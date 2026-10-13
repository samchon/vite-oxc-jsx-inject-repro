# Vite oxc.jsxInject dependency scan reproduction

Vite 8.3.4 discovers an `oxc.jsxInject` dependency when the TSX entry is served, after its initial dependency scan. The equivalent `esbuild.jsxInject` compatibility option discovers it in the initial scan.

```sh
npm install
npm run repro
```

The script creates two cold temporary projects without plugins, prints the optimizer dependency sets before and after transforming the entry, then closes the servers and removes the projects.

| Option | Initial dependencies | Dependencies after serving | Publication changed |
| --- | --- | --- | --- |
| `oxc.jsxInject` | `manual-dep` | `jsx-helper`, `manual-dep` | `true` |
| `esbuild.jsxInject` | `jsx-helper`, `manual-dep` | `jsx-helper`, `manual-dep` | `false` |
