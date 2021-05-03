# Bundler

A Bundler with the web in mind.

![Donate](https://img.shields.io/badge/Deno-≥%201.8-blue.svg?style=for-the-badge&logo=deno)
[![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg?style=for-the-badge)](https://www.paypal.com/donate?hosted_button_id=ACDW2YV2RTP8A)

## Table of Contents <!-- omit in toc -->

- [What is Bundler?](#what-is-bundler)
- [Why use Bundler?](#why-use-bundler)
  - [But there is _deno bundle_ and _Deno.emit_, right?](#but-there-is-deno-bundle-and-denoemit-right)
- [Getting Started](#getting-started)
  - [Installation](#installation)
- [Usage](#usage)
  - [CLI](#cli)
    - [Options](#options)
- [Supported File Types](#supported-file-types)
  - [Typescript and Javascript](#typescript-and-javascript)
    - [Test](#test)
    - [Transformation](#transformation)
    - [Bundle](#bundle)
    - [Optimization](#optimization)
    - [Support](#support)
  - [Json](#json)
    - [Test](#test-1)
    - [Transformation](#transformation-1)
    - [Optimization](#optimization-1)
  - [Webmanifest](#webmanifest)
    - [Test](#test-2)
  - [Html](#html)
    - [Optimization](#optimization-2)
    - [Support](#support-1)
  - [Css](#css)
    - [Test](#test-3)
    - [Transformation](#transformation-2)
    - [Optimization](#optimization-3)
    - [Postcss](#postcss)
    - [A word on preprocessors](#a-word-on-preprocessors)
    - [Support](#support-2)
  - [Images](#images)
    - [Test](#test-4)
    - [Optimization](#optimization-4)
  - [Other](#other)
- [Smart Splitting](#smart-splitting)
- [Examples](#examples)
  - [Hello world](#hello-world)
  - [Components](#components)
  - [Bundler API](#bundler-api)
  - [Others](#others)
- [Unstable](#unstable)

## What is Bundler?

Bundler is a web bundler for deno. It allows to write code for the web like we
are used to with deno.

## Why use Bundler?

- handles relative and absolute imports as well as
  [url imports](https://deno.land/manual/linking_to_external_code)
- [smart splits](#smart-splitting) dependencies
- handles `top level await`
- handles `ts`, `tsx`, `js`, `jsx` `html`, `css`, `json`, `png`, `jpg`, `jpeg`,
  `ico`, `svg`, and other file types
- built in code optimazation and minification with `--optimize` option
- built in file watcher with `--watch` option

- typescript and javascript
  - handles dynamic `import()` statements
  - handles `fetch()` statements
  - handles `WebWorker` imports
  - handles `ServiceWorker` imports
- html
  - handles `<link>`, `<script>`, `<style>` and `<img>` tags
  - handles `style` attributes
  - handles `webmanifest` files
- css
  - handles `css` `@import` statements
  - supports [postcss-preset-env](https://preset-env.cssdb.org) **stage 2** and
    **nesting-rules** by default

### But there is _deno bundle_ and _Deno.emit_, right?

`deno bundle` CLI command and `Deno.emit` can transpile and bundle a file to a
standalone module. This might work for some occations but is limited to script
files. Bundler works similar to `Deno.emit` but with the web in mind.

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

|               Option | Description                                                                                                                                                      | Default |
| -------------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| -c, --config \<FILE> | Load tsconfig.json configuration file                                                                                                                            | {}      |
|     --out-dir \<DIR> | Name of out_dir                                                                                                                                                  | "dist"  |
|           -h, --help | Prints help information                                                                                                                                          |         |
| --import-map \<FILE> | UNSTABLE: Load import map file                                                                                                                                   | {}      |
|           --optimize | Optimize source code                                                                                                                                             | false   |
|      -L, --log-level | Set log level [possible values: debug, info]                                                                                                                     | debug   |
|          -q, --quiet | Suppress diagnostic output                                                                                                                                       | false   |
|         -r, --reload | Reload source code<br>--reload&emsp;Reload everything<br>--reload=index.ts&emsp;Reload only standard modules<br>--reload=a.ts,b.ts&emsp;Reloads specific modules | false   |
|              --watch | Watch files and re-bundle on change                                                                                                                              | false   |

## Supported File Types

### Typescript and Javascript

#### Test

The file path must end with `.ts`, `.tsx`, `.js`, `.jsx`.

#### Transformation

Typescript code will be transpiled into javascript code.

#### Bundle

Bundler will bundle `javascript` sources together while smart splitting
dependencies and injecting file paths.

#### Optimization

Bundler will optimize and minify code with the `--optimize` option using
[terser](https://github.com/terser/terser).

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
import x from "./x.ts";
```

</td>
  <td style="text-align:center">✅</td>
</tr>

<tr>
  <td>import statement</td>
  <td>

```ts
import("./x.ts");
```

</td>
  <td style="text-align:center">✅</td>
</tr>

<tr>
<td>named import</td>
<td>

```ts
import { x } from "./x.ts";
```

</td>
<td style="text-align:center">✅</td>
</tr>

<tr>
<td>namespace import</td>
<td>

```ts
import * as x from "./x.ts";
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
export default "./x.ts";
```

</td>
<td style="text-align:center">✅</td>
</tr>

<tr>
<td>variable export</td>
<td>

```ts
export const x = "x";
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
export { x } from "./x.ts";
```

</td>
<td style="text-align:center">✅</td>
</tr>
<tr>
<td>namespace export</td>
<td>

```ts
export * as x from "./x.ts";
```

</td>
<td style="text-align:center">✅</td>
</tr>

<tr>
<td>unnamed export</td>
<td>

```ts
export * from "./x.ts";
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
fetch("./x.ts");
```

</td>
<td style="text-align:center">✅</td>
</tr>
<tr>
<td>WebWorker</td>
<td>

```ts
new Worker("./x.ts");
```

</td>
<td style="text-align:center">✅</td>
</tr>
<tr>
<td>ServiceWorker</td>
<td>

```ts
navigator.serviceWorker.register("./x.ts");
```

</td>
<td style="text-align:center">✅</td>
</tr>
</tbody>
</table>

### Json

#### Test

The file path must end with `.json`.

#### Transformation

A `json` file will be transformed into an esm module if it is imported diretcly
into typescript or javascript.

```json
/* src/data.json */
{
  "foo": "bar"
}
```

```ts
/* src/x.ts */
import data from "./data.json";
console.log(data); // { "foo": "bar" }
```

#### Optimization

Bundler will minify code with the `--optimize` option using `JSON.stringify`
without spaces.

### Webmanifest

Webmanifest files are specially treated `json` files and src properties in
`icons` are extracted as dependencies.

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

#### Test

The file path can have any extension but must be imported with
`rel="webmanifest"`.

### Html

#### Optimization

Bundler **does not yet** minify html code with the `--optimize` option.

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
<style> div { background: url('image.png'); } </style>
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

### Css

#### Test

The file must have `.css` extension.

#### Transformation

A css file will be transformed into a esm module with a default string export if
the css file is it is imported into typescript or javascript.

```css
/* src/style.json */
div {
  color: red;
}
```

```ts
/* src/x.ts */
import data from "./style.css";
console.log(data); // div { color: red }
```

#### Optimization

Bundler will optimize and minify code with the `--optimize` option using
[csso](https://github.com/css/csso).

#### Postcss

[postcss-preset-env](https://preset-env.cssdb.org) with **stage 2** features and
**nesting-rules** is enabled by default so you can use the latest css features
out of the box.

#### A word on preprocessors

The functionality of css has grown in recent years and is native to browsers.
Therefore bundler focuses on making css usage really easy instead of supporting
preprocessors like sass, scss, less or stylus. Most features a preprocessor does
should be covered with todays css and postcss.

#### Support

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
  <td>@import</td>
  <td>

```css
@import "x.css";
```

</td>

<td style="text-align:center">✅</td>
</tr>

<tr>
  <td>@import url</td>
  <td>

```css
@import url("x.css");
```

</td>
  <td style="text-align:center">✅</td>
</tr>

<tr>
  <td>url</td>
  <td>

```css
div { background: url('image.png'); }
```

</td>
  <td style="text-align:center">✅</td>
</tr>

</tbody>
</table>

### Images

#### Test

The file must have `.ico`, `.png`, `.jpg`, `.jpeg` or `.svg` extension.

#### Optimization

Bundler minifies `.svg` files with the `--optimize` option using
[svgo](https://github.com/svg/svgo).

### Other

Other files can be fetched via the `fetch API`. They will not be transformed or
optimized.

## Smart Splitting

Bundler automatically analyzes the dependency graph and splits dependencies into
separate files, if the code is used in different entry points. This prevents
code duplication and allows bundle files to share code. You can check out
[this example](https://github.com/timreichen/Bundler/tree/master/examples/smart_splitting)
to see smart splitting in action.

## Examples

### Hello world

- [hello world](https://github.com/timreichen/Bundler/tree/master/examples/hello_world)

### Components

- [lit-element](https://github.com/timreichen/Bundler/tree/master/examples/lit_element)
- [react](https://github.com/timreichen/Bundler/tree/master/examples/react)

### Bundler API

- [server](https://github.com/timreichen/Bundler/tree/master/examples/server)

### Others

- [css](https://github.com/timreichen/Bundler/tree/master/examples/css)
- [json](https://github.com/timreichen/Bundler/tree/master/examples/json)
- [images](https://github.com/timreichen/Bundler/tree/master/examples/images)
- [wasm](https://github.com/timreichen/Bundler/tree/master/examples/wasm)
- [webmanifest](https://github.com/timreichen/Bundler/tree/master/examples/webmanifest)
- [webworker](https://github.com/timreichen/Bundler/tree/master/examples/webworker)
- [serviceworker](https://github.com/timreichen/Bundler/tree/master/examples/serviceworker)
- [dynamic import](https://github.com/timreichen/Bundler/tree/master/examples/dynamic_import)
- [smart splitting](https://github.com/timreichen/Bundler/tree/master/examples/smart_splitting)
- [threejs](https://github.com/timreichen/Bundler/tree/master/examples/threejs)

## Unstable

This module requires deno to run with the `--unstable` flag. It is likely to
change in the future.
