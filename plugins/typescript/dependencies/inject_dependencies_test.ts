import { Graph } from "../../../graph.ts";
import { assertEqualsIgnoreWhitespace, tests } from "../../../test_deps.ts";
import { DependencyType } from "../../plugin.ts";
import { injectDependencies } from "./inject_dependencies.ts";
tests({
  name: "typescript transfomer → inject dependencies",
  tests: () => [
    {
      name: "importMap",
      fn() {
        const importMap: Deno.ImportMap = { imports: { "src/": "custom/" } };

        const resolvedInputA = "custom/a.ts";
        const outputA = "dist/a.js";
        const resolvedInputB = "custom/b.ts";
        const outputB = "dist/b.js";
        const source = `import * as A from "./b.ts";`;

        const graph: Graph = {
          [resolvedInputA]: [
            {
              input: resolvedInputA,
              output: outputA,
              type: DependencyType.Import,
              dependencies: {
                [resolvedInputB]: {
                  [DependencyType.Import]: {},
                },
              },
              export: {},
            },
          ],
          [resolvedInputB]: [{
            input: resolvedInputB,
            output: outputB,
            type: DependencyType.Import,
            dependencies: {},
            export: {},
          }],
        };
        const item = {
          history: [resolvedInputA],
          type: DependencyType.Import,
        };

        const transformedSource = injectDependencies(
          outputA,
          item,
          source,
          {
            graph,
            importMap,
          },
        );

        assertEqualsIgnoreWhitespace(
          transformedSource,
          `import * as A from "./b.js";`,
        );
      },
    },
    {
      name: "namespace import",
      fn() {
        const importMap = { imports: {} };

        const inputA = "src/a.ts";
        const outputA = "dist/a.js";
        const inputB = "src/b.ts";
        const outputB = "dist/b.js";
        const source = `import * as A from "./b.ts";`;

        const graph: Graph = {
          [inputA]: [{
            input: inputA,
            output: outputA,
            type: DependencyType.Import,
            dependencies: {
              [inputB]: {
                [DependencyType.Import]: {},
              },
            },
            export: {},
          }],
          [inputB]: [{
            input: inputB,
            output: outputB,
            type: DependencyType.Import,
            dependencies: {},
            export: {},
          }],
        };

        const item = {
          history: [inputA],
          type: DependencyType.Import,
        };
        const transformedSource = injectDependencies(outputA, item, source, {
          graph,
          importMap,
        });

        assertEqualsIgnoreWhitespace(
          transformedSource,
          `import * as A from "./b.js";`,
        );
      },
    },
    {
      name: "named import",
      fn() {
        const importMap: Deno.ImportMap = { imports: {} };

        const inputA = "src/a.ts";
        const outputA = "dist/a.js";
        const inputB = "src/b.ts";
        const outputB = "dist/b.js";
        const source = `import { A, B } from "./b.ts";`;

        const graph: Graph = {
          [inputA]: [{
            input: inputA,
            output: outputA,
            type: DependencyType.Import,
            dependencies: {
              [inputB]: {
                [DependencyType.Import]: {},
              },
            },
            export: {},
          }],
          [inputB]: [{
            input: inputB,
            output: outputB,
            type: DependencyType.Import,
            dependencies: {},
            export: {},
          }],
        };

        const item = {
          history: [inputA],
          type: DependencyType.Import,
        };
        const transformedSource = injectDependencies(outputA, item, source, {
          graph,
          importMap,
        });
        assertEqualsIgnoreWhitespace(
          transformedSource,
          `import { A, B } from "./b.js";`,
        );
      },
    },
    {
      name: "default import",
      fn() {
        const importMap: Deno.ImportMap = { imports: {} };
        const inputA = "src/a.ts";
        const outputA = "dist/a.js";
        const inputB = "src/b.ts";
        const outputB = "dist/b.js";
        const source = `import A from "./b.ts";`;

        const graph: Graph = {
          [inputA]: [{
            input: inputA,
            output: outputA,
            type: DependencyType.Import,
            dependencies: {
              [inputB]: {
                [DependencyType.Import]: {},
              },
            },
            export: {},
          }],
          [inputB]: [{
            input: inputB,
            output: outputB,
            type: DependencyType.Import,
            dependencies: {},
            export: {},
          }],
        };

        const item = {
          history: [inputA],
          type: DependencyType.Import,
        };
        const transformedSource = injectDependencies(outputA, item, source, {
          graph,
          importMap,
        });
        assertEqualsIgnoreWhitespace(
          transformedSource,
          `import A from "./b.js";`,
        );
      },
    },

    {
      name: "module specifier import",
      fn() {
        const importMap: Deno.ImportMap = { imports: {} };
        const inputA = "src/a.ts";
        const outputA = "dist/a.js";
        const inputB = "src/b.ts";
        const outputB = "dist/b.js";
        const source = `import "./b.ts";`;

        const graph: Graph = {
          [inputA]: [{
            input: inputA,
            output: outputA,
            type: DependencyType.Import,
            dependencies: {
              [inputB]: {
                [DependencyType.Import]: {},
              },
            },
            export: {},
          }],
          [inputB]: [{
            input: inputB,
            output: outputB,
            type: DependencyType.Import,
            dependencies: {},
            export: {},
          }],
        };
        const item = {
          history: [inputA],
          type: DependencyType.Import,
        };
        const transformedSource = injectDependencies(outputA, item, source, {
          graph,
          importMap,
        });
        assertEqualsIgnoreWhitespace(transformedSource, `import "./b.js";`);
      },
    },
    {
      name: "dynamic import",
      fn() {
        const importMap: Deno.ImportMap = { imports: {} };
        const inputA = "src/a.ts";
        const outputA = "dist/a.js";
        const inputB = "src/b.ts";
        const outputB = "dist/b.js";
        const source = `import("./b.ts");`;

        const graph: Graph = {
          [inputA]: [{
            input: inputA,
            output: outputA,
            type: DependencyType.Import,
            dependencies: {
              [inputB]: {
                [DependencyType.DynamicImport]: {},
              },
            },
            export: {},
          }],
          [inputB]: [{
            input: inputB,
            output: outputB,
            type: DependencyType.DynamicImport,
            dependencies: {},
            export: {},
          }],
        };
        const item = {
          history: [inputA],
          type: DependencyType.Import,
        };
        const transformedSource = injectDependencies(outputA, item, source, {
          graph,
          importMap,
        });
        assertEqualsIgnoreWhitespace(transformedSource, `import("./b.js");`);
      },
    },
    {
      name: "dynamic import level up",
      fn() {
        const importMap: Deno.ImportMap = { imports: {} };
        const inputA = "src/a.ts";
        const outputA = "dist/a.js";
        const inputB = "src/b.ts";
        const outputB = "dist/deps/b.js";
        const source = `import("./b.ts");`;

        const graph: Graph = {
          [inputA]: [{
            input: inputA,
            output: outputA,
            type: DependencyType.Import,
            dependencies: {
              [inputB]: {
                [DependencyType.DynamicImport]: {},
              },
            },
            export: {},
          }],
          [inputB]: [{
            input: inputB,
            output: outputB,
            type: DependencyType.DynamicImport,
            dependencies: {},
            export: {},
          }],
        };
        const item = {
          history: [inputA],
          type: DependencyType.Import,
        };
        const transformedSource = injectDependencies(outputA, item, source, {
          graph,
          importMap,
        });
        assertEqualsIgnoreWhitespace(
          transformedSource,
          `import("./deps/b.js");`,
        );
      },
    },
    {
      name: "dynamic import level down",
      fn() {
        const importMap: Deno.ImportMap = { imports: {} };
        const inputA = "src/a.ts";
        const outputA = "dist/deps/a.js";
        const inputB = "src/b.ts";
        const outputB = "dist/b.js";
        const source = `import("./b.ts");`;

        const graph: Graph = {
          [inputA]: [{
            input: inputA,
            output: outputA,
            type: DependencyType.Import,
            dependencies: {
              [inputB]: {
                [DependencyType.DynamicImport]: {},
              },
            },
            export: {},
          }],
          [inputB]: [{
            input: inputB,
            output: outputB,
            type: DependencyType.DynamicImport,
            dependencies: {},
            export: {},
          }],
        };
        const item = {
          history: [inputA],
          type: DependencyType.Import,
        };
        const transformedSource = injectDependencies(outputA, item, source, {
          graph,
          importMap,
        });
        assertEqualsIgnoreWhitespace(transformedSource, `import("../b.js");`);
      },
    },
    {
      name: "dynamic import warn",
      fn() {
        const importMap: Deno.ImportMap = { imports: {} };
        const inputA = "src/a.ts";
        const outputA = "dist/a.js";
        const inputB = "src/b.ts";
        const outputB = "dist/b.js";
        const source = `import("./" + "b.ts");`;

        const graph: Graph = {
          [inputA]: [{
            input: inputA,
            output: outputA,
            type: DependencyType.Import,
            dependencies: {
              [inputB]: {
                [DependencyType.Import]: {},
              },
            },
            export: {},
          }],
          [inputB]: [{
            input: inputB,
            output: outputB,
            type: DependencyType.Import,
            dependencies: {},
            export: {},
          }],
        };
        const item = {
          history: [inputA],
          type: DependencyType.Import,
        };
        const transformedSource = injectDependencies(outputA, item, source, {
          graph,
          importMap,
        });
        assertEqualsIgnoreWhitespace(
          transformedSource,
          `import("./" + "b.ts");`,
        );
      },
    },
    {
      name: "type export",
      fn() {
        const importMap: Deno.ImportMap = { imports: {} };
        const inputA = "src/a.ts";
        const outputA = "dist/a.js";
        const inputB = "src/b.ts";
        const outputB = "dist/b.js";
        const source = `export type { A } from "./b.ts";`;

        const graph: Graph = {
          [inputA]: [{
            input: inputA,
            output: outputA,
            type: DependencyType.Import,
            dependencies: {
              [inputB]: {
                [DependencyType.Import]: {},
              },
            },
            export: {},
          }],
          [inputB]: [{
            input: inputB,
            output: outputB,
            type: DependencyType.Import,
            dependencies: {},
            export: {},
          }],
        };
        const item = {
          history: [inputA],
          type: DependencyType.Import,
        };
        const transformedSource = injectDependencies(outputA, item, source, {
          graph,
          importMap,
        });
        assertEqualsIgnoreWhitespace(
          transformedSource,
          `export type { A } from "./b.js";`,
        );
      },
    },
    {
      name: "namespace export",
      fn() {
        const importMap: Deno.ImportMap = { imports: {} };
        const inputA = "src/a.ts";
        const outputA = "dist/a.js";
        const inputB = "src/b.ts";
        const outputB = "dist/b.js";
        const source = `export * from "./b.ts";`;

        const graph: Graph = {
          [inputA]: [{
            input: inputA,
            output: outputA,
            type: DependencyType.Import,
            dependencies: {
              [inputB]: {
                [DependencyType.Import]: {},
              },
            },
            export: {},
          }],
          [inputB]: [{
            input: inputB,
            output: outputB,
            type: DependencyType.Import,
            dependencies: {},
            export: {},
          }],
        };
        const item = {
          history: [inputA],
          type: DependencyType.Import,
        };
        const transformedSource = injectDependencies(outputA, item, source, {
          graph,
          importMap,
        });
        assertEqualsIgnoreWhitespace(
          transformedSource,
          `export * from "./b.js";`,
        );
      },
    },
    {
      name: "namespace alias export",
      fn() {
        const importMap: Deno.ImportMap = { imports: {} };
        const inputA = "src/a.ts";
        const outputA = "dist/a.js";
        const inputB = "src/b.ts";
        const outputB = "dist/b.js";
        const source = `export * as b from "./b.ts";`;

        const graph: Graph = {
          [inputA]: [{
            input: inputA,
            output: outputA,
            type: DependencyType.Import,
            dependencies: {
              [inputB]: {
                [DependencyType.Import]: {},
              },
            },
            export: {},
          }],
          [inputB]: [{
            input: inputB,
            output: outputB,
            type: DependencyType.Import,
            dependencies: {},
            export: {},
          }],
        };
        const item = {
          history: [inputA],
          type: DependencyType.Import,
        };
        const transformedSource = injectDependencies(outputA, item, source, {
          graph,
          importMap,
        });

        assertEqualsIgnoreWhitespace(
          transformedSource,
          `export * as b from "./b.js";`,
        );
      },
    },
    {
      name: "forward named export",
      fn() {
        const importMap: Deno.ImportMap = { imports: {} };
        const inputA = "src/a.ts";
        const outputA = "dist/a.js";
        const inputB = "src/b.ts";
        const outputB = "dist/b.js";
        const source = `export { a, b } from "./b.ts"`;

        const graph: Graph = {
          [inputA]: [{
            input: inputA,
            output: outputA,
            type: DependencyType.Import,
            dependencies: {
              [inputB]: {
                [DependencyType.Import]: {},
              },
            },
            export: {},
          }],
          [inputB]: [{
            input: inputB,
            output: outputB,
            type: DependencyType.Import,
            dependencies: {},
            export: {},
          }],
        };
        const item = {
          history: [inputA],
          type: DependencyType.Import,
        };
        const transformedSource = injectDependencies(outputA, item, source, {
          graph,
          importMap,
        });

        assertEqualsIgnoreWhitespace(
          transformedSource,
          `export { a, b } from "./b.js";`,
        );
      },
    },
    {
      name: "WebWorker",
      fn() {
        const importMap: Deno.ImportMap = { imports: {} };
        const inputA = "src/a.ts";
        const outputA = "dist/a.js";
        const inputB = "src/b.ts";
        const outputB = "dist/b.js";
        const source = `const worker = new Worker("./b.ts")`;

        const graph: Graph = {
          [inputA]: [{
            input: inputA,
            output: outputA,
            type: DependencyType.Import,
            dependencies: {
              [inputB]: {
                [DependencyType.WebWorker]: {},
              },
            },
            export: {},
          }],
          [inputB]: [{
            input: inputB,
            output: outputB,
            type: DependencyType.WebWorker,
            dependencies: {},
            export: {},
          }],
        };
        const item = {
          history: [inputA],
          type: DependencyType.Import,
        };
        const transformedSource = injectDependencies(outputA, item, source, {
          graph,
          importMap,
        });

        assertEqualsIgnoreWhitespace(
          transformedSource,
          `const worker = new Worker("./b.js");`,
        );
      },
    },
    {
      name: "fetch",
      fn() {
        const importMap: Deno.ImportMap = { imports: {} };
        const inputA = "testdata/typescript/fetch/a.ts";
        const outputA = "dist/a.js";
        const inputB = "testdata/typescript/fetch/b.ts";
        const outputB = "dist/b.js";

        const source = `fetch("./b.ts");`;

        const graph: Graph = {
          [inputA]: [{
            input: inputA,
            output: outputA,
            type: DependencyType.Import,
            dependencies: {
              [inputB]: {
                [DependencyType.Fetch]: {},
              },
            },
            export: {},
          }],
          [inputB]: [{
            input: inputB,
            output: outputB,
            type: DependencyType.Fetch,
            dependencies: {},
            export: {},
          }],
        };
        const item = {
          history: [inputA],
          type: DependencyType.Import,
        };
        const transformedSource = injectDependencies(outputA, item, source, {
          graph,
          importMap,
        });

        assertEqualsIgnoreWhitespace(
          transformedSource,
          `fetch("./b.js");`,
        );
      },
    },
    {
      name: "fetch level down",
      fn() {
        const importMap: Deno.ImportMap = { imports: {} };
        const inputA = "testdata/typescript/fetch/a.ts";
        const outputA = "a.js";
        const inputB = "testdata/typescript/fetch/b.ts";
        const outputB = "dist/b.ts";

        const source = `fetch("./b.ts");`;
        const graph: Graph = {
          [inputA]: [{
            input: inputA,
            output: outputA,
            type: DependencyType.Import,
            dependencies: {
              [inputB]: {
                [DependencyType.Fetch]: {},
              },
            },
            export: {},
          }],
          [inputB]: [{
            input: inputB,
            output: outputB,
            type: DependencyType.Fetch,
            dependencies: {},
            export: {},
          }],
        };
        const item = {
          history: [inputA],
          type: DependencyType.Import,
        };
        const transformedSource = injectDependencies(outputA, item, source, {
          graph,
          importMap,
        });

        assertEqualsIgnoreWhitespace(
          transformedSource,
          `fetch("./dist/b.ts");`,
        );
      },
    },
    {
      name: "fetch level up",
      fn() {
        const importMap: Deno.ImportMap = { imports: {} };
        const inputA = "testdata/typescript/fetch/a.ts";
        const outputA = "dist/a.js";
        const inputB = "testdata/typescript/fetch/b.ts";
        const outputB = "b.js";
        const source = `fetch("./b.ts");`;

        const graph: Graph = {
          [inputA]: [{
            input: inputA,
            output: outputA,
            type: DependencyType.Import,
            dependencies: {
              [inputB]: {
                [DependencyType.Fetch]: {},
              },
            },
            export: {},
          }],
          [inputB]: [{
            input: inputB,
            output: outputB,
            type: DependencyType.Fetch,
            dependencies: {},
            export: {},
          }],
        };
        const item = {
          history: [inputA],
          type: DependencyType.Import,
        };
        const transformedSource = injectDependencies(outputA, item, source, {
          graph,
          importMap,
        });

        assertEqualsIgnoreWhitespace(
          transformedSource,
          `fetch("../b.js");`,
        );
      },
    },
    {
      name: "ServiceWorker",
      fn() {
        const importMap: Deno.ImportMap = { imports: {} };
        const inputA = "src/a.ts";
        const outputA = "dist/a.js";
        const inputB = "src/b.ts";
        const outputB = "dist/b.js";
        const source = `navigator.serviceWorker.register("./b.ts");`;

        const graph: Graph = {
          [inputA]: [{
            input: inputA,
            output: outputA,
            type: DependencyType.Import,
            dependencies: {
              [inputB]: {
                [DependencyType.ServiceWorker]: {},
              },
            },
            export: {},
          }],
          [inputB]: [{
            input: inputB,
            output: outputB,
            type: DependencyType.ServiceWorker,
            dependencies: {},
            export: {},
          }],
        };
        const item = {
          history: [inputA],
          type: DependencyType.Import,
        };
        const transformedSource = injectDependencies(outputA, item, source, {
          graph,
          importMap,
        });

        assertEqualsIgnoreWhitespace(
          transformedSource,
          `navigator.serviceWorker.register("./b.js");`,
        );
      },
    },
  ],
});
