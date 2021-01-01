# Bundler
A Bundler with the web in mind.

## Table of Contents  
- [Why Use Bundler?](#why-use-bundler)  
- [What Bundler Does](#what-bundler-does)  
- [Getting Started](#getting-started)
  - [Installation](#installation)
- [Usage](#usage)
  - [CLI](#cli)
- [Supported File Types](#supported-file-types)
  - [typescript and javascript](#typescript-and-javascript)
  - [json](#json)
  - [html](#html)
  - [css](#css)
  - [images](#images)
  - [wasm](#wasm)
- [Smart Splitting](#smart-splitting)
- [Examples](#examples)
  
## Why Use Bundler?

- works out of the box
- no configuration file
- powerful and fast
- built in smart splitting
- built in code optimization

### But there is `deno bundle`, right?
Deno offers `deno bundle` to transpile a file to a standalone module. This might work for some occations but is limited to script files. Bundler works similar to `deno bundle` but with the web in mind.

## What Bundler Does
- handles relative and absolute imports as well as [url imports](https://deno.land/manual/linking_to_external_code)
- handles dynamic `import()` statements and `fetch()` statements
- handles `css` `@import` statements and supports [postcss-preset-env](https://preset-env.cssdb.org) **stage 2** and **nesting-rules** by default
- [smart splits](#smart-splitting) dependencies
- handles `html` `<link>`, `<script>`, `<img>` and `<style>` tags, `<div style="">` attributes as well as `webmanifest` files
- handles `Web Worker` and `Service Worker` imports
- handles `ts`, `tsx`, `js`, `jsx` `html`, `css`, `json`, `png`, `jpg`, `jpeg`, `ico`, `svg`, `wasm`
- built in code optimazation and minification with `--optimize` option
- built in re-bundle with `--watch` option

## Getting Started

### Installation
```sh
deno install --unstable --allow-read --allow-write --allow-net --allow-env --name bundler https://deno.land/x/bundler/cli.ts
```
**Info**: You might need to specify `--root /usr/local`.

## Usage
```sh
bundler bundle index.ts=index.js
```

### CLI

#### Options
|               Option | Description                                  | Default |
| -------------------: | -------------------------------------------- | ------- |
| -c, --config \<FILE> | Load tsconfig.json configuration file        | {}      |
|     --out-dir \<DIR> | Name of out_dir                              | "dist"  |
|           -h, --help | Prints help information                      |         |
| --import-map \<FILE> | UNSTABLE: Load import map file               | {}      |
|           --optimize | Optimize source code                         | false   |
|      -L, --log-level | Set log level [possible values: debug, info] | debug   |
|          -q, --quiet | Suppress diagnostic output                   | false   |
|         -r, --reload | Reload source code                           | false   |
|              --watch | Watch files and re-bundle on change          | false   |

## Supported File Types
### typescript and javascript

#### Test
The file must have `.ts`, `.tsx`, `.js`, `.jsx` as extension or be an `url` without extension.

#### Transformation
Typescript code will be transpiled into javascript code.

#### Bundle
Bundler will bundle `javascript` sources toghether similar to `deno bundle` but smart split dependencies and inject other file paths.

#### Optimization 
Bundler will optimize and minify code with the `--optimize` option.

#### Support
Bundler extracts dependencies from the following statements:

<table>
<thead>
<tr>
<th>Name</th>
<th>Example</th>
<th>Support</th>
</tr>
</thead>
<tbody>

<tr>
  <th>Imports</th>
  <th></th>
  <th></th>
</tr>

<tr>
  <td>default import</td>
  <td>

  ```ts
  import x from "./x.ts"
  ```
  </td>
  <td style="text-align:center">✅</td>
</tr>

<tr>
  <td>import statement</td>
  <td>

  ```ts
  import("./x.ts")
  ```
  </td>
  <td style="text-align:center">✅</td>
</tr>

<tr>
<td>named import</td>
<td>

```ts
import { x } from "./x.ts"
```
</td>
<td style="text-align:center">✅</td>
</tr>

<tr>
<td>namespace import</td>
<td>

```ts
import * as x from "./x.ts"
```
</td>
<td style="text-align:center">✅</td>
</tr>

<tr>
  <th>Exports</th>
  <th></th>
  <th></th>
</tr>

<tr>
<td>default export</td>
<td>

```ts
export default "./x.ts"
```
</td>
<td style="text-align:center">✅</td>
</tr>

<tr>
<td>variable export</td>
<td>

```ts
export const x = "x"
```
</td>
<td style="text-align:center">✅</td>
</tr>
<tr>
<td>function export</td>
<td>

```ts
export function x() {}
```
</td>
<td style="text-align:center">✅</td>
</tr>
<tr>
<td>class export</td>
<td>

```ts
export class X {}
```
</td>
<td style="text-align:center">✅</td>
</tr>
<tr>
<td>named export</td>
<td>

```ts
export { x } from "./x.ts"
```
</td>
<td style="text-align:center">✅</td>
</tr>
<tr>
<td>namespace export</td>
<td>

```ts
export * as x from "./x.ts"
```
</td>
<td style="text-align:center">✅</td>
</tr>

<tr>
<td>unnamed export</td>
<td>

```ts
export * from "./x.ts"
```
</td>
<td style="text-align:center">✅</td>
</tr>

<tr>
  <th>Others</th>
  <th></th>
  <th></th>
</tr>

<tr>
<td>fetch statement</td>
<td>

```ts
fetch("./x.ts")
```
</td>
<td style="text-align:center">✅</td>
</tr>
<tr>
<td>WebWorker</td>
<td>

```ts
new Worker("./x.ts")
```
</td>
<td style="text-align:center">✅</td>
</tr>
<tr>
<td>ServiceWorker</td>
<td>

```ts
navigator.serviceWorker.register("./x.ts")
```
</td>
<td style="text-align:center">✅</td>
</tr>
</tbody>
</table>

### json

#### Test
The file must have `.json` extension or any kind of extension if it is imported as a `webmanifest`.

#### Transformation
A `json` file will be transformed into a esm module if it is imported diretcly into typescript or javascript.
```json
/* src/data.json */
{
  "foo": "bar"
}
```
```ts
/* src/x.ts */
import data from "./data.json"
console.log(data) // { "foo": "bar" }
```

#### Webmanifest
Webmanifest files are specially treated and src properties in `icons` are extracted as dependencies.

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
```json
// src/manifest.json
{
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
  ]
}
```

#### Optimization 
Bundler will minify code with the `--optimize` option.

### html

#### Optimization 
Bundler **does not yet** minify code with the `--optimize` option.

#### Support
Bundler extracts dependencies from the following statements:

<table>
<thead>
<tr>
<th>Name</th>
<th>Example</th>
<th>Support</th>
</tr>
</thead>
<tbody>

<tr>
  <td>script tag</td>
  <td>

  ```html
  <script src="x.ts">
  ```
  </td>
  <td style="text-align:center">✅</td>
</tr>

<tr>
  <td>inline script</td>
  <td>

  ```html
  <script> const x: string = "x" </script>
  ```
  </td>
  <td style="text-align:center">✅</td>
</tr>

<tr>
  <td> link tag </td>
  <td>

  ```html
  <link rel="manifest" href="x.json">
  ```

   ```html
  <link rel="stylesheet" href="x.css">
  ```

   ```html
  <link rel="icon" href="x.png">
  ```
  </td>
  <td style="text-align:center">✅</td>
</tr>

<tr>
  <td>img tag</td>
  <td>

  ```html
  <img src="image.png">
  ```
  </td>
  <td style="text-align:center">✅</td>
</tr>

<tr>
  <td>style tag</td>
  <td>

  ```html
  <style> div { background: url(‘image.png'); } </style>
  ```
  </td>
  <td style="text-align:center">✅</td>
</tr>

<tr>
  <td>style attribute</td>
  <td>

  ```html
  <div style="background: url(‘image.png');"></div>
  ```
  </td>
  <td style="text-align:center">✅</td>
</tr>

</tbody>
</table>

### css

#### Test
The file must have `.css` extension.

#### Transformation
A css file will be transformed into a esm module with a default string export if it is imported into typescript or javascript.

```css
/* src/style.json */
div {
  color: red;
}
```
```ts
/* src/x.ts */
import data from "./style.css"
console.log(data) // div { color: red }
```

#### Optimization 
Bundler will optimize and minify code with the `--optimize` option.


#### Postcss
[postcss-preset-env](https://preset-env.cssdb.org) with **stage 2** features and **nesting-rules** is enabled by default so you can use the latest css features out of the box.

#### A word on preprocessors
The functionality of css has grown in recent years and is native to browsers.
Therefore bundler focuses on making css usage really easy instead of supporting preprocessors like sass, scss, less or stylus.
Most features a preprocessor does is covered with todays css and postcss and supported by browsers.

### images

#### Test
The file must have `.ico`, `.png`, `.jpg`, `.jpeg` or `.svg` extension.

#### Transformation
Image files cannot be imported directly into typescript or javascript (yet), so they will not be transformed in any way. Instead they should be fetched with via `fetch API` or `Image API`.

#### Optimization 
Bundler **does not yet** optimize or compress images with the `--optimize` option.

### wasm
wasm files cannot be imported directly into typescript or javascript (yet), so they will not be transformed in any way. Instead they should be fetched with via `fetch API`.

#### Optimization 
Bundler **does not** optimize or compress wasm with the `--optimize` option.

## Smart Splitting
Bundler automatically analyzes the dependency graph and splits dependencies into separate files, if the code is used in different entry points. This prevents code duplication and allows bundle files to share code.

### Example

#### Structure
Have `a.ts`, `b.ts` and `c.ts` files where `a.ts` and `b.ts` both import `c.ts`
- src
  - `a.ts`
    - import `c.ts`
  - `b.ts`
    - import `c.ts`
  - `c.ts`

#### Single Entry Point
```sh
bundler bundle a.ts=a.js
```
Having `a.ts` as the only entry point will bundle `a.js` like so:
- `a.js`
  - `a.ts`
  - `c.ts`

#### Multiple Entry Points
```sh
bundler bundle a.ts=a.js b.ts=b.js
```
However, if `a.ts` and `b.ts` are both entry points and both import `c.ts`, it will split `c.ts` as a third chunk (named here `c.js`).

- `a.js`
  - `a.ts`
  - import `c.js`
- `b.js`
  - `b.ts`
  - import `c.js`
- `c.js`
  - `c.ts`

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
