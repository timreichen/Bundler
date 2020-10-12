import { assertEquals } from "https://deno.land/std@0.74.0/testing/asserts.ts";
import { resolve } from "./cache.ts";
import { Sha256 } from "./deps.ts";

import { create } from "./graph.ts";
import { typescriptLoader } from "./plugins/loaders/typescript.ts";

Deno.test({
  name: "graph no dependencies",
  fn: async () => {
    const inputMap = {
      "./a.ts": `console.log("ok");`,
    };
    const loaders = [typescriptLoader()];
    const graph = await create(inputMap, loaders);
    assertEquals(graph, {
      "a.ts": {
        path: "a.ts",
        output:
          "0d18d4eb377a214157ad45e7ee0f189a2d7370788a483e729c7f269d94cafe41.js",
        imports: {},
        exports: {},
      },
    });
  },
});

Deno.test({
  name: "graph no dependencies missing path prefix",
  fn: async () => {
    const inputMap = {
      "a.ts": `console.log("ok");`,
    };
    const loaders = [typescriptLoader()];
    const graph = await create(inputMap, loaders);
    assertEquals(graph, {
      "a.ts": {
        path: "a.ts",
        output:
          "0d18d4eb377a214157ad45e7ee0f189a2d7370788a483e729c7f269d94cafe41.js",
        imports: {},
        exports: {},
      },
    });
  },
});

Deno.test({
  name: "graph fileMap",
  fn: async () => {
    const inputMap = {
      "./a.ts": `console.log("ok");`,
    };
    const fileMap = {
      "a.ts": "a.js",
    };
    const loaders = [typescriptLoader()];
    const graph = await create(inputMap, loaders, { fileMap });
    assertEquals(graph, {
      "a.ts": {
        path: "a.ts",
        output: "a.js",
        imports: {},
        exports: {},
      },
    });
  },
});

Deno.test({
  name: "graph fileMap",
  fn: async () => {
    const inputMap = {
      "./a.ts": `console.log("ok");`,
    };
    const fileMap = {
      "./a.ts": "./a.js",
    };
    const loaders = [typescriptLoader()];
    const graph = await create(inputMap, loaders, { fileMap });
    assertEquals(graph, {
      "a.ts": {
        path: "a.ts",
        output: "a.js",
        imports: {},
        exports: {},
      },
    });
  },
});

Deno.test({
  name: "graph import",
  fn: async () => {
    const inputMap = {
      "./a.ts": `import { b } from "./b.ts"`,
      "./b.ts": `export const b = "b"`,
    };
    const loaders = [typescriptLoader()];
    const graph = await create(inputMap, loaders);

    assertEquals(graph, {
      "a.ts": {
        path: "a.ts",
        output:
          "0d18d4eb377a214157ad45e7ee0f189a2d7370788a483e729c7f269d94cafe41.js",
        imports: { "b.ts": { dynamic: false } },
        exports: {},
      },
      "b.ts": {
        path: "b.ts",
        output:
          "ded2f7f761b76f9c30486fd9f691b40d810bc23774a5438361dbb362ce039f63.js",
        imports: {},
        exports: { "b.ts": ["b"] },
      },
    });
  },
});

Deno.test({
  name: "graph export",
  fn: async () => {
    const inputMap = {
      "a.ts": `export const a = "a"`,
    };
    const loaders = [typescriptLoader()];
    const graph = await create(inputMap, loaders);

    assertEquals(graph, {
      "a.ts": {
        path: "a.ts",
        output:
          "0d18d4eb377a214157ad45e7ee0f189a2d7370788a483e729c7f269d94cafe41.js",
        imports: {},
        exports: { "a.ts": ["a"] },
      },
    });
  },
});

Deno.test({
  name: "graph forward export",
  fn: async () => {
    const inputMap = {
      "./a.ts": `export { b } from "./b.ts"`,
      "b.ts": `export const b = "b"`,
    };
    const loaders = [typescriptLoader()];
    const graph = await create(inputMap, loaders);

    assertEquals(graph, {
      "b.ts": {
        path: "b.ts",
        output:
          "ded2f7f761b76f9c30486fd9f691b40d810bc23774a5438361dbb362ce039f63.js",
        imports: {},
        exports: { "b.ts": ["b"] },
      },
      "a.ts": {
        path: "a.ts",
        output:
          "0d18d4eb377a214157ad45e7ee0f189a2d7370788a483e729c7f269d94cafe41.js",
        imports: {},
        exports: { "b.ts": ["b"] },
      },
    });
  },
});

Deno.test({
  name: "graph read",
  fn: async () => {
    const inputMap = {
      "./testdata/a.ts": Deno.readTextFileSync("./testdata/a.ts"),
    };
    const loaders = [typescriptLoader()];
    const graph = await create(inputMap, loaders);

    assertEquals(graph, {
      "testdata/a.ts": {
        path: "testdata/a.ts",
        output:
          "8ab3f6db16d98acaab0ff817eb0498f87fb3d0a4333011665f8d79707ece5761.js",
        imports: {
          "testdata/b.ts": {
            dynamic: false,
          },
        },
        exports: {},
      },
      "testdata/b.ts": {
        path: "testdata/b.ts",
        output:
          "8d0c0c18f2b26feabde651321894a23f2aaed687c96425c4edd85924576a25eb.js",
        imports: {},
        exports: { "testdata/b.ts": ["b"] },
      },
    });
  },
});

Deno.test({
  name: "graph fetch",
  fn: async () => {
    const url = "https://deno.land/std@0.74.0/_util/assert.ts";

    const inputMap = {
      "a.ts": `export * as assert from "${url}"`,
    };
    const loaders = [typescriptLoader()];
    const graph = await create(inputMap, loaders);

    assertEquals(graph, {
      "a.ts": {
        path: "a.ts",
        output:
          "0d18d4eb377a214157ad45e7ee0f189a2d7370788a483e729c7f269d94cafe41.js",
        imports: {},
        exports: { [url]: ["assert"] },
      },
      [url]: {
        path: resolve(url),
        output:
          "34a68f8c5b5dbae81d20664aeb8a0030aace348bf084def2ba2fa4d7e276a912.js",
        imports: {},
        exports: {
          [url]: ["DenoStdInternalError", "assert"],
        },
      },
    });
  },
});
