import { path } from "../deps.ts";
import { assertEquals, assertRejects } from "../test_deps.ts";
import {
  cache,
  extractDependencies,
  resolve as resolveCache,
  resolveDependency,
} from "./cache.ts";

Deno.test({
  name: "cache",
  async fn(t) {
    await t.step({
      name: "resolve",
      fn() {
        const input = "https://deno.land/std/path/mod.ts";
        assertEquals(
          path.basename(resolveCache(input)),
          "72ee5916977ca9d8801c801f642353d811373786e51e3d7574cca966634b4f97",
        );
      },
    });
    await t.step({
      name: "cache file",
      async fn() {
        const input = "https://deno.land/std/path/mod.ts";
        const cachePath = resolveCache(input);
        let exists = true;
        try {
          Deno.removeSync(cachePath);
        } catch {
          exists = false;
          //
        }
        await cache(input);

        assertEquals(Deno.lstatSync(cachePath).isFile, true);

        if (!exists) {
          Deno.removeSync(cachePath);
        }
      },
    });
    await t.step({
      name: "cache failed",
      async fn() {
        await assertRejects(async () => {
          const input = "http://httpstat.us/404";
          await cache(input);
          const cachePath = resolveCache(input);
          Deno.lstatSync(cachePath);
        });
      },
    });
  },
});

Deno.test({
  name: "extract dependencies",
  async fn(t) {
    await t.step({
      name: "resolve path",
      fn() {
        const importMap = {
          imports: {
            "file://some/path/": "file://other/path/",
          },
        };
        const filePath = "file://some/path/parent.ts";
        const moduleSpecifier = "./child.ts";
        const resolvedInput = resolveDependency(
          filePath,
          moduleSpecifier,
          importMap,
        );
        assertEquals(resolvedInput, "file://other/path/child.ts");
      },
    });
    await t.step({
      name: "resolve url",
      fn() {
        const importMap = {
          imports: {
            "file://some/path/": "https://example.com/",
          },
        };
        const filePath = "file://some/path/parent.ts";
        const moduleSpecifier = "./child.ts";
        const resolvedInput = resolveDependency(
          filePath,
          moduleSpecifier,
          importMap,
        );
        assertEquals(
          resolvedInput,
          "https://example.com/child.ts",
        );
      },
    });
    await t.step({
      name: "type import",
      fn() {
        const fileName = "file://foo/a.ts";
        const sourceText = `import type { A } from "./b.ts";`;
        const dependencies = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, new Set(["./b.ts"]));
      },
    });
    await t.step({
      name: "namespace import",
      fn() {
        const fileName = "file://foo/a.ts";
        const sourceText = `import * as A from "./b.ts";`;
        const dependencies = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, new Set(["./b.ts"]));
      },
    });
    await t.step({
      name: "named import",
      fn() {
        const fileName = "file://foo/a.ts";
        const sourceText = `import { A, B } from "./b.ts";`;
        const dependencies = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, new Set(["./b.ts"]));
      },
    });
    await t.step({
      name: "default import",
      fn() {
        const fileName = "file://foo/a.ts";
        const sourceText = `import A from "./b.ts";`;
        const dependencies = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, new Set(["./b.ts"]));
      },
    });
    await t.step({
      name: "module moduleSpecifier import",
      fn() {
        const fileName = "file://foo/a.ts";
        const sourceText = `import "./b.ts";`;
        const dependencies = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, new Set(["./b.ts"]));
      },
    });
    await t.step({
      name: "dynamic import",
      fn() {
        const fileName = "file://foo/a.ts";
        const sourceText = `import("./b.ts");`;
        const dependencies = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, new Set([]));
      },
    });
    await t.step({
      name: "dynamic import warn",
      fn() {
        const fileName = "file://foo/a.ts";
        const sourceText = `import("./" + "b.ts");`;
        const dependencies = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, new Set([]));
      },
    });
    await t.step({
      name: "type export",
      fn() {
        const fileName = "file://foo/a.ts";
        const sourceText = `export type { A } from "./b.ts";`;
        const dependencies = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, new Set(["./b.ts"]));
      },
    });
    await t.step({
      name: "export interface",
      fn() {
        const fileName = "file://foo/a.ts";
        const sourceText = `export interface A { };`;
        const dependencies = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, new Set([]));
      },
    });
    await t.step({
      name: "namespace export",
      fn() {
        const fileName = "file://foo/a.ts";
        const sourceText = `export * from "./b.ts";`;
        const dependencies = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, new Set(["./b.ts"]));
      },
    });
    await t.step({
      name: "namespace alias export",
      fn() {
        const fileName = "file://foo/a.ts";
        const sourceText = `export * as b from "./b.ts";`;
        const dependencies = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, new Set(["./b.ts"]));
      },
    });
    await t.step({
      name: "forward named export",
      fn() {
        const fileName = "file://foo/a.ts";
        const sourceText = `export { a, b } from "./b.ts"`;
        const dependencies = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, new Set(["./b.ts"]));
      },
    });
    await t.step({
      name: "import assertion",
      fn() {
        const fileName = "file://foo/a.ts";
        const sourceText = `import foo from "./b.json" assert { type: "json" }`;
        const dependencies = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, new Set(["./b.json"]));
      },
    });
  },
});
