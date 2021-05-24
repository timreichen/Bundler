import { ts } from "../../../deps.ts";
import { assertEquals, tests } from "../../../test_deps.ts";
import { Dependencies, DependencyType, Format } from "../../plugin.ts";
import { typescriptExtractDependenciesTransformer } from "./extract_dependencies.ts";

tests({
  name: "typescript → extract dependencies transfomer",
  tests: () => [
    {
      name: "type import",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `import type { A } from "./b.ts";`;
        const dependencies: Dependencies = { imports: {}, exports: {} };
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        ts.transform(
          sourceFile,
          [typescriptExtractDependenciesTransformer(dependencies)],
        );
        assertEquals(dependencies.imports, {
          "./b.ts": {
            defaults: [],
            format: 8,
            namespaces: [],
            specifiers: {},
            type: "Import",
            types: {
              A: "A",
            },
          },
        });
        assertEquals(dependencies.exports, {});
      },
    },
    {
      name: "namespace import",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `import * as A from "./b.ts";`;

        const dependencies: Dependencies = { imports: {}, exports: {} };
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        ts.transform(
          sourceFile,
          [typescriptExtractDependenciesTransformer(dependencies)],
        );
        assertEquals(dependencies.imports, {
          "./b.ts": {
            specifiers: {},
            defaults: [],
            namespaces: ["A"],
            types: {},
            type: DependencyType.Import,
            format: Format.Script,
          },
        });
        assertEquals(dependencies.exports, {});
      },
    },
    {
      name: "named import",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `import { A, B } from "./b.ts";`;

        const dependencies: Dependencies = { imports: {}, exports: {} };
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        ts.transform(
          sourceFile,
          [typescriptExtractDependenciesTransformer(dependencies)],
        );
        assertEquals(dependencies.imports, {
          "./b.ts": {
            specifiers: { "A": "A", "B": "B" },
            defaults: [],
            namespaces: [],
            types: {},
            type: DependencyType.Import,
            format: Format.Script,
          },
        });
        assertEquals(dependencies.exports, {});
      },
    },
    {
      name: "named alias import",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `import { A as X, A as Y, B } from "./b.ts";`;

        const dependencies: Dependencies = { imports: {}, exports: {} };
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        ts.transform(
          sourceFile,
          [typescriptExtractDependenciesTransformer(dependencies)],
        );
        assertEquals(dependencies.imports, {
          "./b.ts": {
            specifiers: { "X": "A", "Y": "A", "B": "B" },
            defaults: [],
            namespaces: [],
            types: {},
            type: DependencyType.Import,
            format: Format.Script,
          },
        });
        assertEquals(dependencies.exports, {});
      },
    },
    {
      name: "default import",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `import A from "./b.ts";`;

        const dependencies: Dependencies = { imports: {}, exports: {} };
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        ts.transform(
          sourceFile,
          [typescriptExtractDependenciesTransformer(dependencies)],
        );
        assertEquals(dependencies.imports, {
          "./b.ts": {
            specifiers: {},
            defaults: ["A"],
            namespaces: [],
            types: {},
            type: DependencyType.Import,
            format: Format.Script,
          },
        });
        assertEquals(dependencies.exports, {});
      },
    },
    {
      name: "module specifier import",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `import "./b.ts";`;

        const dependencies: Dependencies = { imports: {}, exports: {} };
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        ts.transform(
          sourceFile,
          [typescriptExtractDependenciesTransformer(dependencies)],
        );
        assertEquals(dependencies.imports, {
          "./b.ts": {
            specifiers: [],
            defaults: [],
            namespaces: [],
            types: {},
            type: DependencyType.Import,
            format: Format.Script,
          },
        });
        assertEquals(dependencies.exports, {});
      },
    },
    {
      name: "dynamic import",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `import("./b.ts");`;

        const dependencies: Dependencies = { imports: {}, exports: {} };
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        ts.transform(
          sourceFile,
          [typescriptExtractDependenciesTransformer(dependencies)],
        );
        assertEquals(dependencies.imports, {
          "./b.ts": {
            defaults: [],
            type: DependencyType.DynamicImport,
            namespaces: [],
            specifiers: {},
            format: Format.Script,
            types: {},
          },
        });
        assertEquals(dependencies.exports, {});
      },
    },
    {
      name: "dynamic import warn",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `import("./" + "b.ts");`;

        const dependencies: Dependencies = { imports: {}, exports: {} };
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        ts.transform(
          sourceFile,
          [typescriptExtractDependenciesTransformer(dependencies)],
        );
        assertEquals(dependencies.imports, {});
        assertEquals(dependencies.exports, {});
      },
    },
    {
      name: "type export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export type { A } from "./b.ts";`;

        const dependencies: Dependencies = { imports: {}, exports: {} };
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        ts.transform(
          sourceFile,
          [typescriptExtractDependenciesTransformer(dependencies)],
        );
        assertEquals(dependencies.imports, {});
        assertEquals(dependencies.exports, {
          "./b.ts": {
            defaults: [],
            format: 8,
            namespaces: [],
            specifiers: {},
            type: "Export",
            types: {
              A: "A",
            },
          },
        });
      },
    },
    {
      name: "export interface",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export interface A { };`;

        const dependencies: Dependencies = { imports: {}, exports: {} };
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        ts.transform(
          sourceFile,
          [typescriptExtractDependenciesTransformer(dependencies)],
        );
        assertEquals(dependencies.imports, {});
        assertEquals(dependencies.exports, {
          "src/a.ts": {
            defaults: [],
            format: 8,
            namespaces: [],
            specifiers: {},
            type: "Export",
            types: {
              A: "A",
            },
          },
        });
      },
    },
    {
      name: "export enum",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export enum A { };`;

        const dependencies: Dependencies = { imports: {}, exports: {} };
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        ts.transform(
          sourceFile,
          [typescriptExtractDependenciesTransformer(dependencies)],
        );
        assertEquals(dependencies.imports, {});
        assertEquals(dependencies.exports, {
          "src/a.ts": {
            specifiers: { "A": "A" },
            defaults: [],
            namespaces: [],
            types: {},
            type: DependencyType.Export,
            format: Format.Script,
          },
        });
      },
    },
    {
      name: "namespace export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export * from "./b.ts";`;

        const dependencies: Dependencies = { imports: {}, exports: {} };
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        ts.transform(
          sourceFile,
          [typescriptExtractDependenciesTransformer(dependencies)],
        );
        assertEquals(dependencies.imports, {});
        assertEquals(dependencies.exports, {
          "./b.ts": {
            specifiers: {},
            defaults: [],
            namespaces: [undefined],
            types: {},
            type: DependencyType.Export,
            format: Format.Script,
          },
        });
      },
    },
    {
      name: "namespace alias export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export * as b from "./b.ts";`;

        const dependencies: Dependencies = { imports: {}, exports: {} };
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        ts.transform(
          sourceFile,
          [typescriptExtractDependenciesTransformer(dependencies)],
        );
        assertEquals(dependencies.imports, {});
        assertEquals(dependencies.exports, {
          "./b.ts": {
            specifiers: {},
            defaults: [],
            namespaces: ["b"],
            types: {},
            type: DependencyType.Export,
            format: Format.Script,
          },
        });
      },
    },
    {
      name: "forward named export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export { a, b } from "./b.ts"`;

        const dependencies: Dependencies = { imports: {}, exports: {} };
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        ts.transform(
          sourceFile,
          [typescriptExtractDependenciesTransformer(dependencies)],
        );
        assertEquals(dependencies.imports, {});
        assertEquals(dependencies.exports, {
          "./b.ts": {
            specifiers: { "a": "a", "b": "b" },
            defaults: [],
            namespaces: [],
            types: {},
            type: DependencyType.Export,
            format: Format.Script,
          },
        });
      },
    },
    {
      name: "named export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `const a = "abc"; const b = "bcd"; export { a, b };`;

        const dependencies: Dependencies = { imports: {}, exports: {} };
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        ts.transform(
          sourceFile,
          [typescriptExtractDependenciesTransformer(dependencies)],
        );

        assertEquals(dependencies.imports, {});
        assertEquals(dependencies.exports, {
          "src/a.ts": {
            specifiers: { "a": "a", "b": "b" },
            defaults: [],
            namespaces: [],
            types: {},
            type: DependencyType.Export,
            format: Format.Script,
          },
        });
      },
    },
    {
      name: "variable export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export const a = "abc";`;

        const dependencies: Dependencies = { imports: {}, exports: {} };
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        ts.transform(
          sourceFile,
          [typescriptExtractDependenciesTransformer(dependencies)],
        );
        assertEquals(dependencies.imports, {});
        assertEquals(dependencies.exports, {
          "src/a.ts": {
            specifiers: { "a": "a" },
            defaults: [],
            namespaces: [],
            types: {},
            type: DependencyType.Export,
            format: Format.Script,
          },
        });
      },
    },
    {
      name: "object variable export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export const { a: x, b, c } = object;`;

        const dependencies: Dependencies = { imports: {}, exports: {} };
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        ts.transform(
          sourceFile,
          [typescriptExtractDependenciesTransformer(dependencies)],
        );
        assertEquals(dependencies.imports, {});
        assertEquals(dependencies.exports, {
          "src/a.ts": {
            specifiers: { "x": "a", "b": "b", "c": "c" },
            defaults: [],
            namespaces: [],
            types: {},
            type: DependencyType.Export,
            format: Format.Script,
          },
        });
      },
    },
    {
      name: "class export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export class A {}`;

        const dependencies: Dependencies = { imports: {}, exports: {} };
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        ts.transform(
          sourceFile,
          [typescriptExtractDependenciesTransformer(dependencies)],
        );
        assertEquals(dependencies.imports, {});
        assertEquals(dependencies.exports, {
          "src/a.ts": {
            specifiers: { "A": "A" },
            defaults: [],
            namespaces: [],
            types: {},
            type: DependencyType.Export,
            format: Format.Script,
          },
        });
      },
    },
    {
      name: "function export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export function a() {};`;

        const dependencies: Dependencies = { imports: {}, exports: {} };
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        ts.transform(
          sourceFile,
          [typescriptExtractDependenciesTransformer(dependencies)],
        );
        assertEquals(dependencies.imports, {});
        assertEquals(dependencies.exports, {
          "src/a.ts": {
            specifiers: { "a": "a" },
            defaults: [],
            namespaces: [],
            types: {},
            type: DependencyType.Export,
            format: Format.Script,
          },
        });
      },
    },
    {
      name: "default assignment export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export default "abc";`;

        const dependencies: Dependencies = { imports: {}, exports: {} };
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        ts.transform(
          sourceFile,
          [typescriptExtractDependenciesTransformer(dependencies)],
        );
        assertEquals(dependencies.imports, {});
        assertEquals(dependencies.exports, {
          "src/a.ts": {
            specifiers: [],
            defaults: [],
            namespaces: [],
            types: {},
            type: DependencyType.Export,
            format: Format.Script,
          },
        });
      },
    },
    {
      name: "default function export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export default function x() {};`;

        const dependencies: Dependencies = { imports: {}, exports: {} };
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        ts.transform(
          sourceFile,
          [typescriptExtractDependenciesTransformer(dependencies)],
        );
        assertEquals(dependencies.imports, {});
        assertEquals(dependencies.exports, {
          "src/a.ts": {
            specifiers: {},
            defaults: ["x"],
            namespaces: [],
            types: {},
            type: DependencyType.Export,
            format: Format.Script,
          },
        });
      },
    },
    {
      name: "default class export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export default class X{};`;

        const dependencies: Dependencies = { imports: {}, exports: {} };
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        ts.transform(
          sourceFile,
          [typescriptExtractDependenciesTransformer(dependencies)],
        );
        assertEquals(dependencies.imports, {});
        assertEquals(dependencies.exports, {
          "src/a.ts": {
            specifiers: {},
            defaults: ["X"],
            namespaces: [],
            types: {},
            type: DependencyType.Export,
            format: Format.Script,
          },
        });
      },
    },
    {
      name: "WebWorker",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `const worker = new Worker("./b.ts")`;

        const dependencies: Dependencies = { imports: {}, exports: {} };
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        ts.transform(
          sourceFile,
          [typescriptExtractDependenciesTransformer(dependencies)],
        );
        assertEquals(dependencies.imports, {
          "./b.ts": {
            defaults: [],
            type: DependencyType.WebWorker,
            namespaces: [],
            specifiers: {},
            format: Format.Script,
            types: {},
          },
        });
        assertEquals(dependencies.exports, {});
      },
    },
    {
      name: "fetch",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `fetch("./b.ts")`;

        const dependencies: Dependencies = { imports: {}, exports: {} };
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        ts.transform(
          sourceFile,
          [typescriptExtractDependenciesTransformer(dependencies)],
        );
        assertEquals(dependencies.imports, {
          "./b.ts": {
            defaults: [],
            type: DependencyType.Fetch,
            namespaces: [],
            specifiers: {},
            format: Format.Script,
            types: {},
          },
        });
        assertEquals(dependencies.exports, {});
      },
    },
    {
      name: "ServiceWorker",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `navigator.serviceWorker.register("./b.ts")`;

        const dependencies: Dependencies = { imports: {}, exports: {} };
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        ts.transform(
          sourceFile,
          [typescriptExtractDependenciesTransformer(dependencies)],
        );
        assertEquals(dependencies.imports, {
          "./b.ts": {
            defaults: [],
            type: DependencyType.ServiceWorker,
            namespaces: [],
            specifiers: {},
            format: Format.Script,
            types: {},
          },
        });
        assertEquals(dependencies.exports, {});
      },
    },
  ],
});
