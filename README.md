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

### But there is ```deno bundle```…
Deno offers ```deno bundle``` to transpile a file to a standalone module. This might work in some occations but is limited.
Bundler works in a similar way to ```deno bundle``` but splits dynamic imports to separate files and injects the proper paths.

## Features
- transpiles deno ```typescript``` to ```javascript``` for the web
- bundles file content and imports into one file
- splits dynamic imports to separate files
- supports css imports into typescript by default

## CLI

### Installation
Bundler is available as a CLI.
```sh
deno install --unstable --allow-read --allow-write --allow-net --allow-env --name bundler https://raw.githubusercontent.com/timreichen/Bundler/master/cli.ts
```
**Info**: You might need to specify ```--root /usr/local```.

### Usage
```sh
bundler bundle index.ts=index.js
```

## Bundler API
Bundler uses the Bundler API to transpile ```typescript``` files to ```javascript```.

### Usage
```ts
import { bundle } from "https://raw.githubusercontent.com/timreichen/Bundler/master/mod.ts"

const inputMap = {
  "src/index.ts": `console.log("Hello World")`
}

const outputMap = {
  "src/index.ts": "dist/index.js",
}

const fileMap = await bundle(inputMap, outputMap)
```

### CSS imports
Bundler CLI supports css imports by default. It supports [postcss-preset-env](https://preset-env.cssdb.org) with **stage 2** features and **nesting-rules** enabled so you can use the latest css features.

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
/* 380B7B38760DD442E897EB0164C58F6A17DA966CCACA6318017A468C163979B1.js */
export default `div { background: red; }`
```
```js
import styles from "./380B7B38760DD442E897EB0164C58F6A17DA966CCACA6318017A468C163979B1.js"
console.log(styles) // div { background: red; }
```

## Examples

- [Hello World](https://github.com/timreichen/Bundler/tree/master/examples/hello%20world)
- [css import](https://github.com/timreichen/Bundler/tree/master/examples/css%20import)
- [lit-element](https://github.com/timreichen/Bundler/tree/master/examples/lit-element)
- [React](https://github.com/timreichen/Bundler/tree/master/examples/react)
- [dynamic import](https://github.com/timreichen/Bundler/tree/master/examples/dynamic%20import)
- [top level await](https://github.com/timreichen/Bundler/tree/master/examples/top%20level%20await)
- [custom bundler](https://github.com/timreichen/Bundler/tree/master/examples/custom%20bundler)
## Proof of concept
This is a proof of concept registry. Do not use in production!
