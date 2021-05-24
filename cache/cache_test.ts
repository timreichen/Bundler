import { assertEquals, assertThrowsAsync, tests } from "../test_deps.ts";
import {
  cache,
  extractDependencies,
  resolve as resolveCache,
} from "./cache.ts";

import { fs, path } from "../deps.ts";
import { resolve } from "../dependency/dependency.ts";

tests({
  name: "cache",
  tests: () => [
    {
      name: "resolve",
      fn: () => {
        const input = "https://deno.land/std@0.70.0/path/mod.ts";
        assertEquals(
          path.basename(resolveCache(input)),
          "19b929fe073c70f585b972cd5ad329ef4ffc4c961a57078c1dbd484c40959364",
        );
      },
    },
    {
      name: "cache",
      fn: async () => {
        const input = "https://deno.land/std@0.70.0/path/mod.ts";
        const cachePath = resolveCache(input);
        const exists = fs.existsSync(cachePath);
        if (exists) {
          Deno.removeSync(cachePath);
        }
        await cache(input);

        assertEquals(fs.existsSync(cachePath), true);
        if (!exists) {
          Deno.removeSync(cachePath);
        }
      },
    },
    {
      name: "cache failed",
      fn: async () => {
        const input = "https://deno.land/x/bundler/file_does_not_exist.ts";
        await assertThrowsAsync(async () => {
          await cache(input);
        }, Error);
      },
    },
    {
      name: "extract dependencies resolve path",
      fn: () => {
        const importMap: Deno.ImportMap = {
          imports: {
            "directory/": "my/path/",
          },
        };
        const path = "directory/parent.ts";
        const specifier = "./child.ts";
        const resolvedInput = resolve(path, specifier, importMap);
        assertEquals(resolvedInput, "my/path/child.ts");
      },
    },
    {
      name: "extract dependencies resolve url",
      fn: () => {
        const importMap = {
          imports: {
            "directory/":
              "https://raw.githubusercontent.com/timreichen/Bundler/master/",
          },
        };
        const path = "directory/parent.ts";
        const specifier = "./child.ts";
        const resolvedInput = resolve(path, specifier, importMap);
        assertEquals(
          resolvedInput,
          "https://raw.githubusercontent.com/timreichen/Bundler/master/child.ts",
        );
      },
    },
    {
      name: "extract dependencies type import",
      fn() {
        const fileName = "foo/a.ts";
        const sourceText = `import type { A } from "./b.ts";`;
        const dependencies = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, new Set(["./b.ts"]));
      },
    },
    {
      name: "extract dependencies namespace import",
      fn() {
        const fileName = "foo/a.ts";
        const sourceText = `import * as A from "./b.ts";`;
        const dependencies = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, new Set(["./b.ts"]));
      },
    },
    {
      name: "extract dependencies named import",
      fn() {
        const fileName = "foo/a.ts";
        const sourceText = `import { A, B } from "./b.ts";`;
        const dependencies = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, new Set(["./b.ts"]));
      },
    },
    {
      name: "extract dependencies default import",
      fn() {
        const fileName = "foo/a.ts";
        const sourceText = `import A from "./b.ts";`;
        const dependencies = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, new Set(["./b.ts"]));
      },
    },
    {
      name: "extract dependencies module specifier import",
      fn() {
        const fileName = "foo/a.ts";
        const sourceText = `import "./b.ts";`;
        const dependencies = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, new Set(["./b.ts"]));
      },
    },
    {
      name: "extract dependencies dynamic import",
      fn() {
        const fileName = "foo/a.ts";
        const sourceText = `import("./b.ts");`;
        const dependencies = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, new Set([]));
      },
    },
    {
      name: "extract dependencies dynamic import warn",
      fn() {
        const fileName = "foo/a.ts";
        const sourceText = `import("./" + "b.ts");`;
        const dependencies = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, new Set([]));
      },
    },
    {
      name: "extract dependencies type export",
      fn() {
        const fileName = "foo/a.ts";
        const sourceText = `export type { A } from "./b.ts";`;
        const dependencies = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, new Set(["./b.ts"]));
      },
    },
    {
      name: "extract dependencies export interface",
      fn() {
        const fileName = "foo/a.ts";
        const sourceText = `export interface A { };`;
        const dependencies = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, new Set([]));
      },
    },
    {
      name: "extract dependencies namespace export",
      fn() {
        const fileName = "foo/a.ts";
        const sourceText = `export * from "./b.ts";`;
        const dependencies = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, new Set(["./b.ts"]));
      },
    },
    {
      name: "extract dependencies namespace alias export",
      fn() {
        const fileName = "foo/a.ts";
        const sourceText = `export * as b from "./b.ts";`;
        const dependencies = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, new Set(["./b.ts"]));
      },
    },
    {
      name: "extract dependencies forward named export",
      fn() {
        const fileName = "foo/a.ts";
        const sourceText = `export { a, b } from "./b.ts"`;
        const dependencies = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, new Set(["./b.ts"]));
      },
    },
  ],
});
