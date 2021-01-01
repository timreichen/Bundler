# Bundler
A bundler that transpiles and bundles deno code for the web.

## Why Use Bundler

- no configuration setup
- handles relative, absolute and [url imports](https://deno.land/manual/linking_to_external_code) with and without file extension
- [smart splits](#Smart-splitting) dependencies
- [`--optimize` option](#Options) minifies `javascript` and `css` code
- [`--watch` option](#Options) observes all dependencies and re-bundles on files changes
- handles `ts`, `tsx`, `js`, `jsx` `html`, `css`, `json`, `png`, `jpg`, `jpeg`, `ico`, `svg`, `wasm`
- handles dynamic imports
- handles `style` attributes and `<style>` tags as well as `@import` declarations
- supports `css` postcss-preset-env *stage 2* and *nesting-rules* by default
- handles `html` `webmanifest` imports
- handles `web worker` and `service worker` imports
- handles `fetch`

### But there is `deno bundle`…
Deno offers `deno bundle` to transpile a file to a standalone module. This might work in some occations but is limited.
Bundler works in a similar way to `deno bundle` but is created with the web in mind.

#### Key differences
- Bundler supports not only `ts`, `tsx`, `js` and `jsx` but a lot of other platform types (`ts`, `tsx`, `js`, `jsx` `html`, `css`, `json`, `png`, `jpg`, `jpeg`, `ico`, `svg`, `wasm`)
- Bundler splits dynamic imports into separate files and injects paths. It splits code that is imported in multiple files so it is only loaded once.
- The `--optimize` option allows for code minification.
- The `--watch` option observes all dependencies and re-bundles on files changes.

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
| Option                    | Description                                     | Default |
|--------------------------:|-------------------------------------------------|---------|
| -c, --config \<FILE>      | Load tsconfig.json configuration file           | {}      |
|     --out-dir \<DIR>      | Name of out_dir                                 | "dist"  |
| -h, --help                | Prints help information                         |         |
|     --import-map \<FILE>  | UNSTABLE: Load import map file                  | {}      |
|     --optimize            | Optimize source code                            | false   |
| -L, --log-level           | Set log level [possible values: debug, info]    | debug   |
| -q, --quiet               | Suppress diagnostic output                      | false   |
| -r, --reload              | Reload source code                              | false   |
|     --watch               | Watch files and re-bundle on change             | false   |

### Smart splitting
Bundler automatically analyzes the dependency graph and splits dependencies into a separate files, if the code is used in different entry points. This allows bundle files to share code.

### Plugins

#### TypescriptPlugin
TypescriptPlugin handles `.ts`, `.tsx`, `.js` and `.jsx` files. This plugin handles modules relative and absolute paths with and without extensions as well as urls.

#### JsonPlugin
JsonPlugin handles `.json` files. This plugin will convert the file into a javascript module with a default string export.

```json
/* src/data.json */
{
  "foo": "bar"
}
```

```js
/* src/index.ts */
import data from "./data.json"
console.log(data) // { "foo": "bar" }
```

**Info** [JSON modules](https://github.com/tc39/proposal-json-modules) is currently at **stage 2**. This plugin might change or even will become obsolete once the next stage is reached.

#### CssPlugin
CssPlugin handles `.css` files. This plugin will convert the file into a javascript module with a default string export.
CSS is native to browsers and bundler therefore focuses on making css usage really easy.
It supports [postcss-preset-env](https://preset-env.cssdb.org) with **stage 2** features and **nesting-rules** enabled so you can use the latest css features out of the box.

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

#### HtmlPlugin
HtmlPlugin handles `.html` files and its `<script>`, `<link>`, `<style>`, `<img>` tags as well as `style` attributes.

```html
<!-- src/index.html -->
<html>
  <head>
  <script type="module" src="index.ts"></script>
    <link rel="stylesheet" href="styles.css">
  </head>
  <body>
    <div style="background: url('image.jpg')"></div>
  </body>
</html>
```

#### WebManifestPlugin
WebManifestPlugin handles webmanifest files that are loaded in a html file. This plugin handles the icons that are declared in the manifest file.
```json
// src/manifest.json
{
  "name": "My App",
  "short_name": "App",
  "icons": [
    {
      "src": "images/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "images/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    }
  ],
  "start_url": "/",
  "background_color": "#000000",
  "display": "standalone",
  "theme_color": "#ffffff"
}
```

```html
<!-- src/index.html -->
<html>
  <head>
    <link rel="manifest" href="manifest.json">
  </head>
  <body>
  </body>
</html>
```

#### ImagePlugin
ImagePlugin handles `.png`, `.jpg`, `.jpeg` and `.ico` files.

#### SvgPlugin
SvgPlugin handles `.svg` files.

#### WasmPlugin
WasmPlugin handles `.wasm` files that are loaded in a typescript or javascript file.

```ts
fetch("simple.wasm").then(response => …)
```

#### WebWorkerPlugin
WebWorkerPlugin handles web worker files that are loaded in a typescript or javascript file.
**Note** Bundler does not analyse ast variables. This plugin will only recognize a web worker, if it is instantiated by `new Worker`.
```ts
const worker = new Worker("worker.ts");
```

#### ServiceWorkerPlugin
ServiceWorkerPlugin handles service worker files that are loaded in a typescript or javascript file.
**Note** Bundler does not analyse ast variables. This plugin will only recognize a service worker, if it is instantiated by `navigator.serviceWorker.register`.
```ts
navigator.serviceWorker.register("sw.ts")
```
## Examples
### Hello world
- [hello world](https://github.com/timreichen/Bundler/tree/master/examples/hello%20world)
### Components
- [lit-element](https://github.com/timreichen/Bundler/tree/master/examples/lit-element)
- [React](https://github.com/timreichen/Bundler/tree/master/examples/react)
### Others
- [css](https://github.com/timreichen/Bundler/tree/master/examples/css)
- [json](https://github.com/timreichen/Bundler/tree/master/examples/json)
- [images](https://github.com/timreichen/Bundler/tree/master/examples/images)
- [wasm](https://github.com/timreichen/Bundler/tree/master/examples/wasm)
- [webmanifest](https://github.com/timreichen/Bundler/tree/master/examples/webmanifest)
- [webworker](https://github.com/timreichen/Bundler/tree/master/examples/webworker)
- [serviceworker](https://github.com/timreichen/Bundler/tree/master/examples/serviceworker)
- [dynamic import](https://github.com/timreichen/Bundler/tree/master/examples/dynamic%20import)
- [smart splitting](https://github.com/timreichen/Bundler/tree/master/examples/smart%20splitting)
- [Threejs](https://github.com/timreichen/Bundler/tree/master/examples/threejs)

## Unstable
This module requires deno to run with the `--unstable` flag. Itis likely to change in the future.
