# Bundler
Bundler is a a deno lightweight alternative bundler to [webpack](https://github.com/webpack/webpack), [rollup](https://github.com/rollup/rollup), [parcel](https://github.com/parcel-bundler/parcel) etc,  <br />
that transpiles Deno ```typescript``` files to ```javascript``` ```esm``` files. <br />

## Why Use Bundler
Typescript as of today does throw an error if an import has a ```.ts``` extension or a url.
```ts
import { foo } from "bar.ts" // Typescript Error
import * as path from "https://deno.land/std/path/mod.ts"  // Typescript Error
```

Deno on the other hand do not allow the suspension of extensions
```ts
import { foo } from "bar" // Deno Error
```

**the Bundler API bundles deno syntax files (url imports, .ts extensions) for the web.** <br />
some of the benefits of using bundler are: 

### No Requirements
- Bundler uses the Deno cache system. No need for a cache directory in your project!
- Bundler does not require node and `package.json` file.

### TypeScript
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

### CSS
Bundler has css import enabled by default.
```css
/* styles.css */
div { background: red; }
```
```js
import styles from "./styles.css"
console.log(styles) // div { background: red; }
```

### Babel
Bundler transforms file content with presets and plugins with babel to ```javascript``` using Babel. <br />
```ts
/* index.ts */
const fn = () => 1;
```
converted to
```js
/* index.js */
var fn = function fn() {
  return 1;
};
```

### Text
Bundler transforms file content to string export module.
```txt
/* hello.txt */
Hello World!
```
```js
/* after bundling */
export default 'Hello World!'
```

## Installation
```sh
deno install --unstable -A --name bundler https://raw.githubusercontent.com/timreichen/Bundler/master/cli.ts
```
**Info**: You might need to specify ```--root /usr/local```.

## Usage
```sh
bundler bundle --name index.js index.ts
```

## Example with [lit-element](https://github.com/Polymer/lit-element);
```ts
// src/element.ts
import styles from "./styles.css";

@customElement("my-element")
export class MyElement extends LitElement {
  static styles = unsafeCSS(styles);

  render() {
    const name: string = "Click Me";
    return html`<button @click="${this.clickHandler}">${name}</button>`;
  }
}
```
```ts
// src/index.ts
import "./element";
```

```sh
bundler bundle --name index.js src/index.ts
```
### Output
- src
  - element.ts
  - index.ts
  - styles.css
- dist
  - index.js (imported in index.html)
  - deps
    - deps.json
    - 8277fbd0-903e-4a4b-87a7-cfa876924c7a.js

<br /> [Link](https://github.com/timreichen/Bundler/tree/master/examples/example_3) to full example 

## Proof of concept
This is a proof of concept registry. Do not use in production!
