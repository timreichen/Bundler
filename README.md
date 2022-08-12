# Bundler

![Bundler](./static/icon.svg)

- [About](#about)
- [Goals](#goals)
- [Features](#features)
  - [Typescript and Javascript](#typescript-and-javascript)
  - [HTML](#html)
  - [CSS](#css)
  - [Smart-Splitting](#smart-splitting)
  - [Dev tools](#dev-tools)
- [Installation](#installation)
- [Usage](#usage)
  - [CLI](#cli)
  - [API](#api)
- [Unstable](#unstable)

## About

Bundler is a zero configuration bundler with the web in mind.

## Goals

- Webplatform and Deno are the source of truth
- Embrace the future (no legacy feature support)
- No configuration setup
- Allow flexible and modular usage of bundler API and CLI

## Features

### Typescript and Javascript

- handles static `import` and `export` statements
- handles dynamic `import()` statements
- handles `fetch()` statements
- handles `WebWorker` imports
- handles `ServiceWorker` imports

### HTML

- handles `<link>`, `<script>`, `<style>`, `<source>`, `<img>` and `<video>`
  tags
- handles `style` attributes

### CSS

- handles `css` `@import` statements
- supports [postcss-preset-env](https://preset-env.cssdb.org) **stage 2** and
  **nesting-rules** by default

### Smart-Splitting

Bundler automatically analyzes the dependency graph and splits dependencies into
separate files, if it is used on multiple occasions. This prevents code
duplication and allows multiple bundle files to share code.

### Dev tools

- built in file watcher with `--watch` option
- built in code optimization and minification with `--optimize` option
- uses cache dir `.bundler` for faster reloads

## Installation

```sh
deno install --unstable --allow-read --allow-write --allow-net --allow-env --name bundler https://deno.land/x/bundler/cli.ts
```

**Info**: You might need to specify `--root /usr/local`.

## Usage

### CLI

```sh
bundler bundle index.html=index.html
```

This will analyze the entry file `index.html` and its dependencies, generate
bundles and write the output files into an directory.

#### Options <!-- omit in toc -->

|               Option | Description                                                                                                                                                                                                                                                                                                                                                           | Default |
| -------------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| -c, --config \<FILE> | The configuration file can be used to configure different aspects of<br>deno including TypeScript, linting, and code formatting. Typically<br>the configuration file will be called `deno.json` or `deno.jsonc`<br>and automatically detected; in that case this flag is not necessary.<br>See<br>https://deno.land/manual@v1.22.0/getting_started/configuration_file | {}      |
|     --out-dir \<DIR> | Name of out_dir                                                                                                                                                                                                                                                                                                                                                       | "dist"  |
|           -h, --help | Prints help information                                                                                                                                                                                                                                                                                                                                               |         |
| --import-map \<FILE> | Load import map file from local file or remote URL.<br>Docs:<br>https://deno.land/manual@v1.22.0/linking_to_external_code/import_maps<br>Specification: https://wicg.github.io/import-maps/<br>Examples: https://github.com/WICG/import-maps#the-import-mapfile                                                                                                       | {}      |
|           --optimize | Optimize source code                                                                                                                                                                                                                                                                                                                                                  | false   |
|      -L, --log-level | Set log level [possible values: debug, info]                                                                                                                                                                                                                                                                                                                          | debug   |
|          -q, --quiet | Suppress diagnostic output                                                                                                                                                                                                                                                                                                                                            | false   |
|              --watch | Watch files and re-bundle on change                                                                                                                                                                                                                                                                                                                                   | false   |

### API

#### Example <!-- omit in toc -->

```ts
import { bundle } from "https://deno.land/x/bundler/mod.ts";

const input = "src/index.html";

const inputs = [input];
const outputMap = { [input]: "index.html" };

const { bundles } = await bundle(inputs, { outputMap });
```

#### Advanced Example <!-- omit in toc -->

```ts
import {
  Bundler,
  HTMLPlugin,
  TypescriptPlugin,
} from "https://deno.land/x/bundler/mod.ts";

const input = "src/index.html";

const inputs = [input];
const outputMap = { [input]: "index.html" };

const plugins = [
  new HTMLPlugin(),
  new TypescriptPlugin(),
];

const bundler = new Bundler({ plugins });

const assets = await bundler.createAssets(inputs);
const chunks = await bundler.createChunks(inputs, assets, { outputMap });
const bundles = await bundler.createBundles(chunks);
```

## Unstable

This module requires deno to run with the `--unstable` flag. It is likely to
change in the future.
