<!-- deno-fmt-ignore-file -->
# Bundler
![Donate](https://img.shields.io/badge/Deno-≥%201.11.0-blue.svg?style=for-the-badge&logo=deno)
[![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg?style=for-the-badge)](https://www.paypal.com/donate?hosted_button_id=ACDW2YV2RTP8A)

![Bundler](https://github.com/timreichen/Bundler/blob/master/static/Icon.svg)

- [About](#about)
- [Installation](#installation)
  - [Bundler CLI](#bundler-cli)
- [Usage](#usage)
  - [Bundler CLI](#bundler-cli-1)
  - [Dev Server CLI](#dev-server-cli)
  - [SPA Dev Server CLI](#spa-dev-server-cli)
  - [API](#api)
- [Smart Splitting](#smart-splitting)
- [Examples](#examples)
- [Unstable](#unstable)

## About
Bundler is a zero configuration bundler with the web in mind. 

- [smart splits](#smart-splitting) dependencies
- handles `top level await`
- typescript and javascript
  - handles static `import` and `export` statements
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
  - supports [postcss-preset-env](https://preset-env.cssdb.org) **stage 2** and **nesting-rules** by default
- CLI
  - built in code optimization and minification with `--optimize` option
  - built in file watcher with `--watch` option

## Installation

### Bundler CLI
```sh
deno install --unstable --allow-read --allow-write --allow-net --allow-env --name bundler https://deno.land/x/bundler/cli.ts
```

**Info**: You might need to specify `--root /usr/local`.

## Usage

### Bundler CLI

```sh
bundler bundle index.html=index.html
```

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

### Dev Server CLI

```sh
deno run --unstable --allow-read --allow-write --allow-net --allow-env https://deno.land/x/bundler/server_cli.ts
```

### SPA Dev Server CLI

```sh
deno run --unstable --allow-read --allow-write --allow-net --allow-env https://deno.land/x/bundler/spa_server_cli.ts
```

### API

#### Bundler Example  <!-- omit in toc -->
```ts
import { createBundler } from "https//deno.land/x/bundler/mod.ts";
const bundler = createBundler(); // create bundler instance with default plugins

const input = "src/index.html";
const outputMap = { [input]: "index.html" };

const { bundles } = await bundler.bundle([inputs], { outputMap });
```

#### Advanced Bundler Example  <!-- omit in toc -->
```ts
import { Bundler } from "https//deno.land/x/bundler/mod.ts";

const input = "src/index.html";
const outputMap = { [input]: "index.html" };

const plugins = [ … ];
const bundler = new Bundler(plugins); // create bundler instance with custom plugins

const graph = await bundler.createGraph([input], { outputMap });
const chunks = await bundler.createChunks(inputs, graph);
const bundles = await bundler.createBundles(chunks, graph);
```

#### Bundler Server  <!-- omit in toc -->
```ts
import { Server } from "https//deno.land/x/bundler/mod.ts";
const server = new Server();
await server.listen({ port: 8000 });
```

## Smart Splitting

Bundler automatically analyzes the dependency graph and splits dependencies into separate files, if the code is used in different entry points. This prevents code duplication and allows multiple bundle files to share code.

## Examples
### Bundler CLI  <!-- omit in toc -->
- [hello world](https://github.com/timreichen/Bundler/tree/master/examples/hello_world)
- [lit-element](https://github.com/timreichen/Bundler/tree/master/examples/lit_element)
- [react](https://github.com/timreichen/Bundler/tree/master/examples/react)
- [webworker](https://github.com/timreichen/Bundler/tree/master/examples/webworker)
- [serviceworker](https://github.com/timreichen/Bundler/tree/master/examples/serviceworker)
- [webmanifest](https://github.com/timreichen/Bundler/tree/master/examples/webmanifest)
- [threejs](https://github.com/timreichen/Bundler/tree/master/examples/threejs)
- [wasm](https://github.com/timreichen/Bundler/tree/master/examples/wasm)

### Bundler API  <!-- omit in toc -->

- [server](https://github.com/timreichen/Bundler/tree/master/examples/server)

## Unstable

This module requires deno to run with the `--unstable` flag. It is likely to
change in the future.
