import { bundle } from "./bundler.ts";
import {
  assert,
  assertArrayContains,
  assertEquals,
} from "https://deno.land/std@0.74.0/testing/asserts.ts";
import type { InputMap } from "./graph.ts";
import { typescriptLoader } from "./plugins/loaders/typescript.ts";
import { typescriptInjectSpecifiers } from "./plugins/transformers/typescript_inject_specifiers.ts";

Deno.test({
  name: "bundle inputMap",
  fn: async () => {
    const inputMap: InputMap = {
      "./a.ts": `console.log("hello world");`,
    };
    const loaders = [
      typescriptLoader({
        test: (input: string) =>
          input.startsWith("http") || /\.(tsx?|jsx?)$/.test(input),
      }),
    ];
    const { outputMap, cacheMap, graph } = await bundle(inputMap, {
      quiet: true,
      loaders,
    });
    assertEquals(
      Object.keys(outputMap),
      ["dist/deps/0d18d4eb377a214157ad45e7ee0f189a2d7370788a483e729c7f269d94cafe41.js"],
    );
    assertEquals(
      Object.keys(cacheMap),
      ["dist/.cache/0d18d4eb377a214157ad45e7ee0f189a2d7370788a483e729c7f269d94cafe41"],
    );
    assertEquals(graph, {
      "a.ts": {
        path: "a.ts",
        output:
          "dist/deps/0d18d4eb377a214157ad45e7ee0f189a2d7370788a483e729c7f269d94cafe41.js",
        imports: {},
        exports: {},
      },
    });
  },
});

Deno.test({
  name: "bundle fileMap",
  fn: async () => {
    const inputMap: InputMap = {
      "./a.ts": `console.log("hello world");`,
    };
    const fileMap = {
      "./a.ts": "./a.js",
    };
    const loaders = [
      typescriptLoader({
        test: (input: string) =>
          input.startsWith("http") || /\.(tsx?|jsx?)$/.test(input),
      }),
    ];
    const { outputMap, cacheMap, graph } = await bundle(inputMap, {
      quiet: true,
      fileMap,
      loaders,
    });
    assertEquals(Object.keys(outputMap), ["a.js"]);
    assertEquals(
      Object.keys(cacheMap),
      ["dist/.cache/0d18d4eb377a214157ad45e7ee0f189a2d7370788a483e729c7f269d94cafe41"],
    );
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
  name: "bundle dynamic Import",
  fn: async () => {
    const inputMap: InputMap = {
      "./a.ts": `await import("./b.ts")`,
      "./b.ts": `export const b = "b"`,
    };
    const fileMap = {
      "./a.ts": "./a.js",
      "b.ts": "b.js",
    };
    const loaders = [
      typescriptLoader({
        test: (input: string) =>
          input.startsWith("http") || /\.(tsx?|jsx?)$/.test(input),
      }),
    ];
    const transformers = [
      typescriptInjectSpecifiers({
        test: (input: string) =>
          input.startsWith("http") || /\.(css|tsx?|jsx?)$/.test(input),
        compilerOptions: {
          target: "es2015",
          module: "system",
        },
      }),
    ];
    const { outputMap, cacheMap, graph } = await bundle(inputMap, {
      quiet: true,
      fileMap,
      loaders,
      transformers,
    });
    assertArrayContains(Object.keys(outputMap), ["a.js", "b.js"]);
    assertArrayContains(Object.keys(cacheMap), [
      "dist/.cache/ded2f7f761b76f9c30486fd9f691b40d810bc23774a5438361dbb362ce039f63",
      "dist/.cache/0d18d4eb377a214157ad45e7ee0f189a2d7370788a483e729c7f269d94cafe41",
    ]);

    assert(!outputMap["a.js"].includes("import * as"));

    assertEquals(graph, {
      "b.ts": {
        path: "b.ts",
        output: "b.js",
        imports: {},
        exports: { "b.ts": ["b"] },
      },
      "a.ts": {
        path: "a.ts",
        output: "a.js",
        imports: { "b.ts": { dynamic: true } },
        exports: {},
      },
    });
  },
});

Deno.test({
  name: "bundle smart splitting",
  fn: async () => {
    const inputMap: InputMap = {
      "./a.ts": `import { b } from "./b.ts"; console.log(b)`,
      "./b.ts": `export const b = "b"`,
    };
    const fileMap = {
      "a.ts": "a.js",
      "./b.ts": "./b.js",
    };
    const loaders = [
      typescriptLoader({
        test: (input: string) =>
          input.startsWith("http") || /\.(tsx?|jsx?)$/.test(input),
      }),
    ];
    const transformers = [
      typescriptInjectSpecifiers({
        test: (input: string) =>
          input.startsWith("http") || /\.(css|tsx?|jsx?)$/.test(input),
        compilerOptions: {
          target: "es2015",
          module: "system",
        },
      }),
    ];
    const { outputMap, cacheMap, graph } = await bundle(inputMap, {
      quiet: true,
      fileMap,
      loaders,
      transformers,
    });
    assertArrayContains(Object.keys(outputMap), ["a.js", "b.js"]);
    assertArrayContains(Object.keys(cacheMap), [
      "dist/.cache/ded2f7f761b76f9c30486fd9f691b40d810bc23774a5438361dbb362ce039f63",
      "dist/.cache/0d18d4eb377a214157ad45e7ee0f189a2d7370788a483e729c7f269d94cafe41",
    ]);

    assert(
      outputMap["a.js"].includes(
        `import * as _ded2f7f761b76f9c30486fd9f691b40d810bc23774a5438361dbb362ce039f63 from "./b.js";`,
      ),
    );

    assertEquals(graph, {
      "b.ts": {
        path: "b.ts",
        output: "b.js",
        imports: {},
        exports: { "b.ts": ["b"] },
      },
      "a.ts": {
        path: "a.ts",
        output: "a.js",
        imports: { "b.ts": { dynamic: false } },
        exports: {},
      },
    });
  },
});
