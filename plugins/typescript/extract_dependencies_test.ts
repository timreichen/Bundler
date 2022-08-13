import { assertEquals } from "../../test_deps.ts";
import { DependencyFormat, DependencyType } from "../plugin.ts";
import { extractDependencies } from "./extract_dependencies.ts";
import { parse } from "./_util.ts";

Deno.test({
  name: "import",
  async fn(t) {
    await t.step({
      name: "type",
      async fn() {
        const input = "/src/a.ts";
        const source = `import type { A } from "./b.ts";`;
        const ast = parse(source);
        const dependencies = await extractDependencies(input, ast);
        assertEquals(dependencies, [
          {
            input: "file:///src/b.ts",
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
        ]);
      },
    });
    await t.step({
      name: "namespace",
      async fn() {
        const input = "/src/a.ts";
        const source = `import * as A from "./b.ts";`;
        const ast = parse(source);
        const dependencies = await extractDependencies(input, ast);
        assertEquals(dependencies, [
          {
            input: "file:///src/b.ts",
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
        ]);
      },
    });
    await t.step({
      name: "named",
      async fn() {
        const input = "/src/a.ts";
        const source = `import { A, B } from "./b.ts";`;
        const ast = parse(source);
        const dependencies = await extractDependencies(input, ast);
        assertEquals(dependencies, [
          {
            input: "file:///src/b.ts",
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
        ]);
      },
    });
    await t.step({
      name: "named alias",
      async fn() {
        const input = "/src/a.ts";
        const source = `import { A as X, A as Y, B } from "./b.ts";`;
        const ast = parse(source);
        const dependencies = await extractDependencies(input, ast);
        assertEquals(dependencies, [
          {
            input: "file:///src/b.ts",
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
        ]);
      },
    });
    await t.step({
      name: "default",
      async fn() {
        const input = "/src/a.ts";
        const source = `import A from "./b.ts";`;
        const ast = parse(source);
        const dependencies = await extractDependencies(input, ast);
        assertEquals(dependencies, [
          {
            input: "file:///src/b.ts",
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
        ]);
      },
    });
    await t.step({
      name: "module moduleSpecifier",
      async fn() {
        const input = "/src/a.ts";
        const source = `import "./b.ts";`;
        const ast = parse(source);
        const dependencies = await extractDependencies(input, ast);
        assertEquals(dependencies, [
          {
            input: "file:///src/b.ts",
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
        ]);
      },
    });
    await t.step({
      name: "dynamic",
      async fn() {
        const input = "/src/a.ts";
        const source = `import("./b.ts");`;
        const ast = parse(source);
        const dependencies = await extractDependencies(input, ast);
        assertEquals(dependencies, [
          {
            input: "file:///src/b.ts",
            type: DependencyType.DynamicImport,
            format: DependencyFormat.Script,
          },
        ]);
      },
    });
    await t.step({
      name: "dynamic import warn",
      async fn() {
        const input = "/src/a.ts";
        const source = `import("./" + "b.ts");`;
        const ast = parse(source);
        const dependencies = await extractDependencies(input, ast);
        assertEquals(dependencies, []);
      },
    });
    await t.step({
      name: "type",
      async fn() {
        const input = "/src/a.ts";
        const source = `export type { A } from "./b.ts";`;
        const ast = parse(source);
        const dependencies = await extractDependencies(input, ast);
        assertEquals(dependencies, [
          {
            input: "file:///src/b.ts",
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
        ]);
      },
    });
  },
});

Deno.test({
  name: "export",
  async fn(t) {
    await t.step({
      name: "namespace",
      async fn() {
        const input = "/src/a.ts";
        const source = `export * from "./b.ts";`;
        const ast = parse(source);
        const dependencies = await extractDependencies(input, ast);
        assertEquals(dependencies, [
          {
            input: "file:///src/b.ts",
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
        ]);
      },
    });

    await t.step({
      name: "namespace alias",
      async fn() {
        const input = "/src/a.ts";
        const source = `export * as b from "./b.ts";`;
        const ast = parse(source);
        const dependencies = await extractDependencies(input, ast);
        assertEquals(dependencies, [
          {
            input: "file:///src/b.ts",
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
        ]);
      },
    });
    await t.step({
      name: "forward named",
      async fn() {
        const input = "/src/a.ts";
        const source = `export { a, b } from "./b.ts"`;
        const ast = parse(source);
        const dependencies = await extractDependencies(input, ast);
        assertEquals(dependencies, [
          {
            input: "file:///src/b.ts",
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
        ]);
      },
    });
  },
});

Deno.test({
  name: "WebWorker",
  async fn() {
    const input = "/src/a.ts";
    const source = `const worker = new Worker("./b.ts")`;
    const ast = parse(source);
    const dependencies = await extractDependencies(
      input,
      ast,
    );
    assertEquals(dependencies, [
      {
        input: "file:///src/b.ts",
        format: DependencyFormat.Script,
        type: DependencyType.WebWorker,
      },
    ]);
  },
});
Deno.test({
  name: "Audio",
  async fn() {
    const input = "/src/a.ts";
    const source = `const audio = new Audio("./b.ts")`;
    const ast = parse(source);
    const dependencies = await extractDependencies(
      input,
      ast,
    );
    assertEquals(dependencies, [
      {
        input: "file:///src/b.ts",
        format: DependencyFormat.Binary,
        type: DependencyType.ImportExport,
      },
    ]);
  },
});
Deno.test({
  name: "fetch",
  async fn() {
    const input = "/src/a.ts";
    const source = `fetch("./b.ts")`;
    const ast = parse(source);
    const dependencies = await extractDependencies(
      input,
      ast,
    );
    assertEquals(dependencies, [
      {
        input: "file:///src/b.ts",
        format: DependencyFormat.Script,
        type: DependencyType.Fetch,
      },
    ]);
  },
});
Deno.test({
  name: "ServiceWorker",
  async fn() {
    const input = "/src/a.ts";
    const source = `navigator.serviceWorker.register("./b.ts")`;
    const ast = parse(source);
    const dependencies = await extractDependencies(
      input,
      ast,
    );
    assertEquals(dependencies, [
      {
        input: "file:///src/b.ts",
        format: DependencyFormat.Script,
        type: DependencyType.ServiceWorker,
      },
    ]);
  },
});

Deno.test({
  name: "json module",
  async fn() {
    const input = "/src/a.ts";
    const source = `import json from "./b.json" assert { type: "json" }`;
    const ast = parse(source);
    const dependencies = await extractDependencies(
      input,
      ast,
    );
    assertEquals(dependencies, [
      {
        input: "file:///src/b.json",
        format: DependencyFormat.Json,
        type: DependencyType.ImportExport,
      },
    ]);
  },
});

Deno.test({
  name: "css module",
  async fn() {
    const input = "/src/a.ts";
    const source = `import css from "./b.css" assert { type: "css" }`;
    const ast = parse(source);
    const dependencies = await extractDependencies(
      input,
      ast,
    );
    assertEquals(dependencies, [
      {
        input: "file:///src/b.css",
        format: DependencyFormat.Style,
        type: DependencyType.ImportExport,
      },
    ]);
  },
});
