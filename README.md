# Bundler
A lightweight bundler that transpiles deno ```typescript``` files for the web.

## Why Use Bundler
Typescript as of today does throw an error if an import has a ```.ts``` extension or a url.
```ts
import { foo } from "bar.ts" // Typescript Error
import * as path from "https://deno.land/std/path/mod.ts"  // Typescript Error
```

Deno on the other hand does not allow the suspension of extensions.
```ts
import { foo } from "bar" // Deno Error
```

Bundler bundles deno syntax files (url imports, .ts extensions) for the web.

### But there is ```deno bundle```
Deno offers ```deno bundle``` to transpile a file to a standalone module. This may  work in the web for small modules, but is not not ideal for large projects where code needs to be dynamically imported.

## Main features
- transpiles deno ```typescript``` to ```javascript``` for the web
- supports css imports by default

## CLI

### Installation
Bundler is available as a CLI.
```sh
deno install --unstable --allow-read --allow-write --allow-net --allow-env https://raw.githubusercontent.com/timreichen/Bundler/master/cli.ts --name bundler 
```
**Info**: You might need to specify ```--root /usr/local```.

### Usage
```sh
bundler bundle index.ts --name index.js
```

## Bundler API
Bundler uses the Bundler API to transpile ```typescript``` files to ```javascript```.

### Usage
```ts
import { Bundler } from "https://raw.githubusercontent.com/timreichen/Bundler/master/mod.ts"

const entry = {
  path: "src/index.ts",
  name: "index.js",
  dir: "dist",
}

const compilerOptions = {
  target: "ESNext",
  module: "ESNext",
}

const bundler = new Bundler()

await bundler.bundle(entry, { compilerOptions })

```
## How does it work?
### TypeScript
Bundler makes it possible to transpile typescript files with ```.ts``` extension for the web.
It automatically resolves URL paths, fetches and caches the content.

Before
  ```ts
/* index.ts */
import { foo } from "https://url/to/somewhere.ts"
console.log(foo)
```
After
```js
import { foo } from "./8277fbd0-903e-4a4b-87a7-cfa876924c7a.js"
console.log(foo)
```

### CSS
Bundler CLI supports css imports by default.

Before
```css
/* styles.css */
div { background: red; }
```
```js
import styles from "./styles.css"
```
After
```js
/* 8277fbd0-903e-4a4b-87a7-cfa876924c7a.js */
export default `div { background: red; }`
```
```js
import styles from "./8277fbd0-903e-4a4b-87a7-cfa876924c7a.js"
console.log(styles) // div { background: red; }
```

## Examples

- [Hello World](https://github.com/timreichen/Bundler/tree/master/examples/hello%20world)
- [css import](https://github.com/timreichen/Bundler/tree/master/examples/css%20import)
- [lit-element](https://github.com/timreichen/Bundler/tree/master/examples/lit-element)
- [React](https://github.com/timreichen/Bundler/tree/master/examples/react)

## Proof of concept
This is a proof of concept registry. Do not use in production!
