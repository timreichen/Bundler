# Bundler
A lightweight bundler that transpiles and bundles for the web.

## Why Use Bundler

- transpiles and bundles files
- handles url import statements
- handles imports with and without extensions
- splits dynamic imports to separate files
- does [smart splits](#Smart-splitting)
- [`--optimize` option](#Options) minifies `javascript` and `css` files
- [`--watch` option](#Options) observes all dependencies and re-bundles on files changes
- allows [imports of `css` files](#CSS-imports) and converts them to `javascript` modules
- handles `css` `@import` statements
- supports `css` postcss-preset-env *stage 2* and *nesting-rules* by default

### But there is `deno bundle`…
Deno offers `deno bundle` to transpile a file to a standalone module. This might work in some occations but is limited.
Bundler works in a similar way to `deno bundle` but splits dynamic imports to separate files and injects paths.
The `--optimize` option also allows for code minification with both `javascript` and `css` files.
It also has a `--watch` option that observes all dependencies and re-bundles on files changes.

### File extensions and url imports
Typescript as of today does throw an error if an import has a `.ts` extension or a url.
```ts
import { foo } from "bar.ts" // Typescript Error
import * as path from "https://deno.land/std/path/mod.ts"  // Typescript Error
```

Deno on the other hand does not allow the suspension of extensions.
```ts
import { foo } from "bar" // Deno Error
```

Bundler handles file extensions as well as url imports and uses the same cached files as deno does.

## CLI

### Installation
Bundler is available as a CLI.
```sh
deno install --unstable --allow-read --allow-write --allow-net --allow-env --name bundler https://deno.land/x/bundler/cli.ts
```
**Info**: You might need to specify `--root /usr/local`.

### Usage
```sh
bundler bundle index.ts=index.js
```
#### Options
| Option              | Description                           | Default |
|---------------------:|--------------------------------------|---------|
| -c, --config <FILE> | Load tsconfig.json configuration file | {}      |
| --out-dir <DIR>     | Name of out_dir                       | "dist"  |
| -h, --help          | Prints help information               |         |
| --importmap <FILE>  | UNSTABLE: Load import map file        | {}      |
| --optimize          | Minify source code                    | false   |
| -q, --quiet         | Suppress diagnostic output            | false   |
| -r, --reload        | Reload source code                    | false   |
| --watch             | Watch files and re-bundle on change   | false   |


## Bundler API
Bundler uses the Bundler API to transpile `typescript` files to `javascript`.

### Usage
```ts
import { bundle } from "deno.land/x/bundler/mod.ts"

const inputMap = {
  "src/index.ts": `console.log("Hello World")`
}

const fileMap = {
  "src/index.ts": "dist/index.js"
}

const { outputMap, cacheMap, graph } = await bundle(inputMap, { fileMap })
for (const [output, source] of Object.entries(outputMap)) {
  await fs.ensureFile(output);
  await Deno.writeTextFile(output, source);
}
```

### Smart splitting
#### What is smart splitting?
Bundler automatically analyzes the dependency graph and splits dependencies from a bundle into a separate files, if the code is used in different entry points.
This
- allows bundle files to share code
- allows bundle files to import other bundle files
- makes multiple bundle files smaller, because they will not contain the same code multiple times

### CSS imports
CSS is native to browsers and bundler therefore focuses on making css usage really easy.
It supports [postcss-preset-env](https://preset-env.cssdb.org) with **stage 2** features and **nesting-rules** enabled so you can use the latest css features out of the box.
You can import css files directly in your typescript files. Bundler will convert the css file into a javascript module with a default string export.

```css
/* src/styles.css */
article {
  & > p {
    color: red;
  }
}
```

```js
/* src/index.ts */
import styles from "./styles.css"
console.log(styles) // article > p { color: red; }
```

## Examples

- [Hello World](https://github.com/timreichen/Bundler/tree/master/examples/hello%20world)
- [css import](https://github.com/timreichen/Bundler/tree/master/examples/css%20import)
- [lit-element](https://github.com/timreichen/Bundler/tree/master/examples/lit-element)
- [React](https://github.com/timreichen/Bundler/tree/master/examples/react)
- [dynamic import](https://github.com/timreichen/Bundler/tree/master/examples/dynamic%20import)
- [top level await](https://github.com/timreichen/Bundler/tree/master/examples/top%20level%20await)
- [smart split](https://github.com/timreichen/Bundler/tree/master/examples/smart%split)
- [custom bundler](https://github.com/timreichen/Bundler/tree/master/examples/custom%20bundler)

## Unstable
This module is likely to change in the future. Do not use in production!
