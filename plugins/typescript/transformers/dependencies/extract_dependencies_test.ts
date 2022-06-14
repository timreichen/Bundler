import { assertEquals } from "../../../../test_deps.ts";
import { DependencyFormat, DependencyType } from "../../../plugin.ts";
import { extractDependencies } from "./extract_dependencies.ts";

Deno.test({
  name: "import",
  async fn(t) {
    await t.step({
      name: "type",
      fn() {
        const fileName = "/src/a.ts";
        const sourceText = `import type { A } from "./b.ts";`;
        const { dependencies, exports } = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, [
          {
            input: "file:///src/b.ts",
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            types: { A: "A" },
          },
        ]);
        assertEquals(exports, {});
      },
    });
    await t.step({
      name: "namespace",
      fn() {
        const fileName = "/src/a.ts";
        const sourceText = `import * as A from "./b.ts";`;
        const { dependencies, exports } = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, [
          {
            input: "file:///src/b.ts",
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            namespaces: ["A"],
          },
        ]);
        assertEquals(exports, {});
      },
    });
    await t.step({
      name: "named",
      fn() {
        const fileName = "/src/a.ts";
        const sourceText = `import { A, B } from "./b.ts";`;
        const { dependencies, exports } = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, [
          {
            input: "file:///src/b.ts",
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            specifiers: { "A": "A", "B": "B" },
          },
        ]);
        assertEquals(exports, {});
      },
    });
    await t.step({
      name: "named alias",
      fn() {
        const fileName = "/src/a.ts";
        const sourceText = `import { A as X, A as Y, B } from "./b.ts";`;
        const { dependencies, exports } = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, [
          {
            input: "file:///src/b.ts",
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            specifiers: { "X": "A", "Y": "A", "B": "B" },
          },
        ]);
        assertEquals(exports, {});
      },
    });
    await t.step({
      name: "default",
      fn() {
        const fileName = "/src/a.ts";
        const sourceText = `import A from "./b.ts";`;
        const { dependencies, exports } = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, [
          {
            input: "file:///src/b.ts",
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            default: "A",
          },
        ]);
        assertEquals(exports, {});
      },
    });
    await t.step({
      name: "module moduleSpecifier",
      fn() {
        const fileName = "/src/a.ts";
        const sourceText = `import "./b.ts";`;
        const { dependencies, exports } = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, [
          {
            input: "file:///src/b.ts",
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
        ]);
        assertEquals(exports, {});
      },
    });
    await t.step({
      name: "dynamic",
      fn() {
        const fileName = "/src/a.ts";
        const sourceText = `import("./b.ts");`;
        const { dependencies, exports } = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, [
          {
            input: "file:///src/b.ts",
            type: DependencyType.DynamicImport,
            format: DependencyFormat.Script,
          },
        ]);
        assertEquals(exports, {});
      },
    });
    await t.step({
      name: "dynamic import warn",
      fn() {
        const fileName = "/src/a.ts";
        const sourceText = `import("./" + "b.ts");`;
        const { dependencies, exports } = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, []);
        assertEquals(exports, {});
      },
    });
    await t.step({
      name: "type",
      fn() {
        const fileName = "/src/a.ts";
        const sourceText = `export type { A } from "./b.ts";`;
        const { dependencies, exports } = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, [
          {
            input: "file:///src/b.ts",
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            types: { A: "A" },
          },
        ]);
        assertEquals(exports, {});
      },
    });
  },
});

Deno.test({
  name: "export",
  async fn(t) {
    await t.step({
      name: "interface",
      fn() {
        const fileName = "/src/a.ts";
        const sourceText = `export interface A { };`;
        const { dependencies, exports } = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, []);
        assertEquals(exports, {
          types: { A: "A" },
        });
      },
    });
    await t.step({
      name: "enum",
      fn() {
        const fileName = "/src/a.ts";
        const sourceText = `export enum A { };`;
        const { dependencies, exports } = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, []);
        assertEquals(exports, {
          specifiers: { "A": "A" },
        });
      },
    });
    await t.step({
      name: "namespace",
      fn() {
        const fileName = "/src/a.ts";
        const sourceText = `export * from "./b.ts";`;
        const { dependencies, exports } = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, [
          {
            input: "file:///src/b.ts",
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            namespaces: ["*"],
          },
        ]);
        assertEquals(exports, {});
      },
    });
    await t.step({
      name: "named alias default",
      fn() {
        const fileName = "/src/a.ts";
        const sourceText = `export { x as default };`;
        const { dependencies, exports } = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, []);
        assertEquals(exports, {
          default: "x",
        });
      },
    });
    await t.step({
      name: "namespace alias",
      fn() {
        const fileName = "/src/a.ts";
        const sourceText = `export * as b from "./b.ts";`;
        const { dependencies, exports } = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, [
          {
            input: "file:///src/b.ts",
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            namespaces: ["b"],
          },
        ]);
        assertEquals(exports, {});
      },
    });
    await t.step({
      name: "forward named",
      fn() {
        const fileName = "/src/a.ts";
        const sourceText = `export { a, b } from "./b.ts"`;
        const { dependencies, exports } = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, [
          {
            input: "file:///src/b.ts",
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            specifiers: { a: "a", b: "b" },
          },
        ]);
        assertEquals(exports, {});
      },
    });
    await t.step({
      name: "named",
      fn() {
        const fileName = "/src/a.ts";
        const sourceText = `const a = "abc"; const b = "bcd"; export { a, b };`;
        const { dependencies, exports } = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, []);
        assertEquals(exports, {
          specifiers: { "a": "a", "b": "b" },
        });
      },
    });
    await t.step({
      name: "variable",
      fn() {
        const fileName = "/src/a.ts";
        const sourceText = `export const a = "abc";`;
        const { dependencies, exports } = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, []);
        assertEquals(exports, {
          specifiers: { "a": "a" },
        });
      },
    });
    await t.step({
      name: "object variable",
      fn() {
        const fileName = "/src/a.ts";
        const sourceText = `export const { a: x, b, c } = object;`;
        const { dependencies, exports } = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, []);
        assertEquals(exports, {
          specifiers: { "x": "a", "b": "b", "c": "c" },
        });
      },
    });
    await t.step({
      name: "class",
      fn() {
        const fileName = "/src/a.ts";
        const sourceText = `export class A {}`;
        const { dependencies, exports } = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, []);
        assertEquals(exports, {
          specifiers: { "A": "A" },
        });
      },
    });
    await t.step({
      name: "function",
      fn() {
        const fileName = "/src/a.ts";
        const sourceText = `export function a() {};`;
        const { dependencies, exports } = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, []);
        assertEquals(exports, {
          specifiers: { "a": "a" },
        });
      },
    });
    await t.step({
      name: "default assignment",
      fn() {
        const fileName = "/src/a.ts";
        const sourceText = `export default "abc";`;
        const { dependencies, exports } = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, []);
        assertEquals(exports, {
          default: true,
        });
      },
    });
    await t.step({
      name: "default function",
      fn() {
        const fileName = "/src/a.ts";
        const sourceText = `export default function x() {};`;
        const { dependencies, exports } = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, []);
        assertEquals(exports, {
          default: "x",
        });
      },
    });
    await t.step({
      name: "default class",
      fn() {
        const fileName = "/src/a.ts";
        const sourceText = `export default class X{};`;
        const { dependencies, exports } = extractDependencies(
          fileName,
          sourceText,
        );
        assertEquals(dependencies, []);
        assertEquals(exports, {
          default: "X",
        });
      },
    });
  },
});

Deno.test({
  name: "WebWorker",
  fn() {
    const fileName = "/src/a.ts";
    const sourceText = `const worker = new Worker("./b.ts")`;
    const { dependencies, exports } = extractDependencies(
      fileName,
      sourceText,
    );
    assertEquals(dependencies, [
      {
        input: "file:///src/b.ts",
        format: DependencyFormat.Script,
        type: DependencyType.WebWorker,
      },
    ]);
    assertEquals(exports, {});
  },
});
Deno.test({
  name: "fetch",
  fn() {
    const fileName = "/src/a.ts";
    const sourceText = `fetch("./b.ts")`;
    const { dependencies, exports } = extractDependencies(
      fileName,
      sourceText,
    );
    assertEquals(dependencies, [
      {
        input: "file:///src/b.ts",
        format: DependencyFormat.Script,
        type: DependencyType.Fetch,
      },
    ]);
    assertEquals(exports, {});
  },
});
Deno.test({
  name: "ServiceWorker",
  fn() {
    const fileName = "/src/a.ts";
    const sourceText = `navigator.serviceWorker.register("./b.ts")`;
    const { dependencies, exports } = extractDependencies(
      fileName,
      sourceText,
    );
    assertEquals(dependencies, [
      {
        input: "file:///src/b.ts",
        format: DependencyFormat.Script,
        type: DependencyType.ServiceWorker,
      },
    ]);
    assertEquals(exports, {});
  },
});

Deno.test({
  name: "json module",
  fn() {
    const fileName = "/src/a.ts";
    const sourceText = `import json from "./b.json" assert { type: "json" }`;
    const { dependencies, exports } = extractDependencies(
      fileName,
      sourceText,
    );
    assertEquals(dependencies, [
      {
        input: "file:///src/b.json",
        format: DependencyFormat.Json,
        type: DependencyType.ImportExport,
        default: "json",
      },
    ]);
    assertEquals(exports, {});
  },
});

Deno.test({
  name: "css module",
  fn() {
    const fileName = "/src/a.ts";
    const sourceText = `import css from "./b.css" assert { type: "css" }`;
    const { dependencies, exports } = extractDependencies(
      fileName,
      sourceText,
    );
    assertEquals(dependencies, [
      {
        input: "file:///src/b.css",
        format: DependencyFormat.Style,
        type: DependencyType.ImportExport,
        default: "css",
      },
    ]);
    assertEquals(exports, {});
  },
});
