import { assertEquals, tests } from "../../../test_deps.ts";
import { DependencyType } from "../../plugin.ts";
import { extractDependencies } from "./extract_dependencies.ts";

tests({
  name: "typescript → extract dependencies transfomer",
  tests: () => [
    {
      name: "type import",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `import type { A } from "./b.ts";`;
        const dependencies = extractDependencies(fileName, sourceText);
        assertEquals(dependencies, {
          dependencies: {
            "./b.ts": {
              [DependencyType.Import]: {
                types: {
                  A: "A",
                },
              },
            },
          },
          export: {},
        });
      },
    },
    {
      name: "namespace import",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `import * as A from "./b.ts";`;
        const dependencies = extractDependencies(fileName, sourceText);
        assertEquals(dependencies, {
          dependencies: {
            "./b.ts": {
              [DependencyType.Import]: {
                namespaces: ["A"],
              },
            },
          },
          export: {},
        });
      },
    },
    {
      name: "named import",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `import { A, B } from "./b.ts";`;
        const dependencies = extractDependencies(fileName, sourceText);
        assertEquals(dependencies, {
          dependencies: {
            "./b.ts": {
              [DependencyType.Import]: {
                specifiers: { "A": "A", "B": "B" },
              },
            },
          },
          export: {},
        });
      },
    },
    {
      name: "named alias import",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `import { A as X, A as Y, B } from "./b.ts";`;
        const dependencies = extractDependencies(fileName, sourceText);
        assertEquals(dependencies, {
          dependencies: {
            "./b.ts": {
              [DependencyType.Import]: {
                specifiers: { "X": "A", "Y": "A", "B": "B" },
              },
            },
          },
          export: {},
        });
      },
    },
    {
      name: "default import",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `import A from "./b.ts";`;
        const dependencies = extractDependencies(fileName, sourceText);
        assertEquals(dependencies, {
          dependencies: {
            "./b.ts": {
              [DependencyType.Import]: {
                defaults: ["A"],
              },
            },
          },
          export: {},
        });
      },
    },
    {
      name: "module specifier import",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `import "./b.ts";`;
        const dependencies = extractDependencies(fileName, sourceText);
        assertEquals(dependencies, {
          dependencies: {
            "./b.ts": {
              [DependencyType.Import]: {},
            },
          },
          export: {},
        });
      },
    },
    {
      name: "dynamic import",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `import("./b.ts");`;
        const dependencies = extractDependencies(fileName, sourceText);
        assertEquals(dependencies, {
          dependencies: {
            "./b.ts": {
              [DependencyType.DynamicImport]: {},
            },
          },
          export: {},
        });
      },
    },
    {
      name: "dynamic import warn",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `import("./" + "b.ts");`;
        const dependencies = extractDependencies(fileName, sourceText);
        assertEquals(dependencies, {
          dependencies: {},
          export: {},
        });
      },
    },
    {
      name: "type export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export type { A } from "./b.ts";`;
        const dependencies = extractDependencies(fileName, sourceText);
        assertEquals(dependencies, {
          dependencies: {
            "./b.ts": {
              Import: {
                types: {
                  A: "A",
                },
              },
            },
          },
          export: {
            types: {
              "A": "A",
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
        const dependencies = extractDependencies(fileName, sourceText);
        assertEquals(dependencies, {
          dependencies: {},
          export: {
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
        const dependencies = extractDependencies(fileName, sourceText);
        assertEquals(dependencies, {
          dependencies: {},
          export: {
            specifiers: { "A": "A" },
          },
        });
      },
    },
    {
      name: "namespace export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export * from "./b.ts";`;
        const dependencies = extractDependencies(fileName, sourceText);
        assertEquals(dependencies, {
          dependencies: {
            "./b.ts": {
              Import: {
                namespaces: [
                  "*",
                ],
              },
            },
          },
          export: {
            namespaces: [
              "./b.ts",
            ],
          },
        });
      },
    },
    {
      name: "named alias default export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export { x as default };`;
        const dependencies = extractDependencies(fileName, sourceText);
        assertEquals(dependencies, {
          dependencies: {},
          export: {
            specifiers: {
              "default": "x",
            },
          },
        });
      },
    },
    {
      name: "namespace alias export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export * as b from "./b.ts";`;
        const dependencies = extractDependencies(fileName, sourceText);
        assertEquals(dependencies, {
          dependencies: {
            "./b.ts": {
              Import: {
                namespaces: [
                  "b",
                ],
              },
            },
          },
          export: {
            specifiers: {
              b: "b",
            },
          },
        });
      },
    },
    {
      name: "forward named export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export { a, b } from "./b.ts"`;
        const dependencies = extractDependencies(fileName, sourceText);
        assertEquals(dependencies, {
          dependencies: {
            "./b.ts": {
              Import: {
                specifiers: {
                  a: "a",
                  b: "b",
                },
              },
            },
          },
          export: {
            specifiers: {
              a: "a",
              b: "b",
            },
          },
        });
      },
    },
    {
      name: "named export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `const a = "abc"; const b = "bcd"; export { a, b };`;
        const dependencies = extractDependencies(fileName, sourceText);
        assertEquals(dependencies, {
          dependencies: {},
          export: {
            specifiers: { "a": "a", "b": "b" },
          },
        });
      },
    },
    {
      name: "variable export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export const a = "abc";`;
        const dependencies = extractDependencies(fileName, sourceText);
        assertEquals(dependencies, {
          dependencies: {},
          export: {
            specifiers: { "a": "a" },
          },
        });
      },
    },
    {
      name: "object variable export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export const { a: x, b, c } = object;`;
        const dependencies = extractDependencies(fileName, sourceText);
        assertEquals(dependencies, {
          dependencies: {},
          export: {
            specifiers: { "x": "a", "b": "b", "c": "c" },
          },
        });
      },
    },
    {
      name: "class export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export class A {}`;
        const dependencies = extractDependencies(fileName, sourceText);
        assertEquals(dependencies, {
          dependencies: {},
          export: {
            specifiers: { "A": "A" },
          },
        });
      },
    },
    {
      name: "function export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export function a() {};`;
        const dependencies = extractDependencies(fileName, sourceText);
        assertEquals(dependencies, {
          dependencies: {},
          export: {
            specifiers: { "a": "a" },
          },
        });
      },
    },
    {
      name: "default assignment export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export default "abc";`;
        const dependencies = extractDependencies(fileName, sourceText);
        assertEquals(dependencies, {
          dependencies: {},
          export: {
            default: true,
          },
        });
      },
    },
    {
      name: "default function export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export default function x() {};`;
        const dependencies = extractDependencies(fileName, sourceText);
        assertEquals(dependencies, {
          dependencies: {},
          export: {
            default: "x",
          },
        });
      },
    },
    {
      name: "default class export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export default class X{};`;
        const dependencies = extractDependencies(fileName, sourceText);
        assertEquals(dependencies, {
          dependencies: {},
          export: {
            default: "X",
          },
        });
      },
    },
    {
      name: "WebWorker",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `const worker = new Worker("./b.ts")`;
        const dependencies = extractDependencies(fileName, sourceText);
        assertEquals(dependencies, {
          dependencies: {
            "./b.ts": {
              [DependencyType.WebWorker]: {},
            },
          },
          export: {},
        });
      },
    },
    {
      name: "fetch",
      fn() {
        const fileName = "testdata/typescript/fetch/a.ts";
        const sourceText = `fetch("./b.ts")`;
        const dependencies = extractDependencies(fileName, sourceText);
        assertEquals(dependencies, {
          dependencies: {
            "./b.ts": {
              [DependencyType.Fetch]: {},
            },
          },
          export: {},
        });
      },
    },
    {
      name: "ServiceWorker",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `navigator.serviceWorker.register("./b.ts")`;
        const dependencies = extractDependencies(fileName, sourceText);
        assertEquals(dependencies, {
          dependencies: {
            "./b.ts": {
              [DependencyType.ServiceWorker]: {},
            },
          },
          export: {},
        });
      },
    },
  ],
});
