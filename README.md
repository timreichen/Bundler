# Bundler
Bundler transpiles Deno ```typescript``` files to ```javascript``` ```esm``` files.

### Motivation
Typescript as of today does throw an error if an import has a ```.ts``` extension or a url.
```ts
import { foo } from "bar.ts" // Typescript Error
import * as path from "https://deno.land/std/path/mod.ts"  // Typescript Error
```

Deno on the other hand do not allow the suspension of extensions
```ts
import { foo } from "bar" // Deno Error
```

Bundler makes it possible to transpile typescript files with ```.ts``` extension for the web.
It automatically resolves URL paths and fetches the content.
  ```ts
/* index.ts */
import { foo } from "https://url/to/somewhere.ts"
console.log(foo)
```
```js
import { foo } from "./8277fbd0-903e-4a4b-87a7-cfa876924c7a.js"
console.log(foo) // div "hello world"
```
It has css import enabled by default
```css
/* styles.css */
div { background: red; }
```
```js
import styles from "./styles.css"
console.log(styles) // div { background: red; }
```

### Installation
```sh
deno install --unstable --allow-read --allow-write --allow-net --allow-env --name bundler cli.ts
```
**Info**: You might need to specify ```--root /usr/local```.
### Usage
```sh
bundler bundle --name index.js index.ts
```

### Plugins
#### typescript
  transforms ```typescript``` file content to ```javascript``` module
#### text
  transforms file content to string export module
#### babel
  transforms file content with presets and plugins with babel to ```javascript``` module
#### postcss
  transforms css file content

### Cache
Bundler uses the deno cache system. No need for a cache directory in your project!

### Example
```ts
// src/a.ts
export const a = "hello world"
```
```ts
// src/index.ts
import { a } from "./foo/a.ts"
console.log(a)
```
```sh
bundler bundle --name index.js src/index.ts
```
#### Output
- src
  - foo
    - a.ts
  - index.ts
- dist
  - index.js
  - deps
    - deps.json
    - 8277fbd0-903e-4a4b-87a7-cfa876924c7a.js

### Proof of concept
This is a proof of concept registry. Do not use in production!
