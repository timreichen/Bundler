import { ImportMap, ts } from "../../../deps.ts";
import { Graph } from "../../../graph.ts";
import {
  assertEquals,
  assertStringIncludes,
  tests,
} from "../../../test_deps.ts";
import { Chunk, DependencyType, Format } from "../../plugin.ts";
import { typescriptInjectDependenciesTranformer } from "./inject_dependencies.ts";

const defaultCompilerOptions: ts.CompilerOptions = {
  jsx: ts.JsxEmit.React,
  jsxFactory: "React.createElement",
  jsxFragmentFactory: "React.Fragment",
  allowJs: false,
  allowUmdGlobalAccess: false,
  allowUnreachableCode: false,
  allowUnusedLabels: false,
  alwaysStrict: true,
  assumeChangesOnlyAffectDirectDependencies: false,
  checkJs: false,
  disableSizeLimit: false,
  generateCpuProfile: "profile.cpuprofile",
  lib: [],
  noFallthroughCasesInSwitch: false,
  noImplicitAny: true,
  noImplicitReturns: true,
  noImplicitThis: true,
  noImplicitUseStrict: false,
  noStrictGenericChecks: false,
  noUnusedLocals: false,
  noUnusedParameters: false,
  preserveConstEnums: false,
  removeComments: false,
  // resolveJsonModule: true,
  strict: true,
  strictBindCallApply: true,
  strictFunctionTypes: true,
  strictNullChecks: true,
  strictPropertyInitialization: true,
  suppressExcessPropertyErrors: false,
  suppressImplicitAnyIndexErrors: false,
  useDefineForClassFields: false,
};

const compilerOptions: ts.CompilerOptions = {
  ...defaultCompilerOptions,
  target: ts.ScriptTarget.Latest,
};

const printer: ts.Printer = ts.createPrinter({ removeComments: false });

tests({
  name: "typescript transfomer → inject dependencies",
  tests: () => [
    {
      name: "importMap",
      fn() {
        const importMap: ImportMap = { imports: { "src/": "custom/path/" } };
        const input = "src/a.ts";
        const resolvedInput = "custom/path/a.ts";
        const bundleOutput = "dist/a.js";
        const dependency = "src/b.ts";
        const resolvedDependency = "custom/path/b.ts";
        const dependencyOutput = "dist/b.js";
        const source = `import * as A from "./b.ts";`;

        const graph: Graph = {
          [resolvedInput]: {
            [DependencyType.Import]: {
              filePath: resolvedInput,
              output: bundleOutput,
              dependencies: {
                imports: {
                  [dependency]: {
                    specifiers: {},
                    defaults: [],
                    namespaces: [],
                    type: DependencyType.Import,
                    format: Format.Script,
                  },
                },
                exports: {},
              },
              format: Format.Script,
            },
          },
          [resolvedDependency]: {
            [DependencyType.Import]: {
              filePath: resolvedDependency,
              output: dependencyOutput,
              dependencies: { imports: {}, exports: {} },
              format: Format.Script,
            },
          },
        };
        const chunk: Chunk = {
          history: [resolvedInput],
          type: DependencyType.Import,
          format: Format.Script,
          dependencies: [
            {
              history: [resolvedDependency],
              type: DependencyType.Import,
              format: Format.Script,
            },
          ],
        };

        const sourceFile = ts.createSourceFile(
          input,
          source,
          ts.ScriptTarget.Latest,
        );
        const transformers = [
          typescriptInjectDependenciesTranformer(
            chunk,
            { graph, importMap },
          ),
        ];
        const { diagnostics, transformed } = ts.transform(
          sourceFile,
          transformers,
          compilerOptions,
        );
        const outputText = printer.printFile(transformed[0]);
        assertEquals(diagnostics, []);
        assertStringIncludes(outputText, `import * as A from "./b.js";`);
      },
    },
    {
      name: "namespace import",
      fn() {
        const importMap: ImportMap = { imports: {} };
        const input = "src/a.ts";
        const bundleOutput = "dist/a.js";
        const dependency = "src/b.ts";
        const dependencyOutput = "dist/b.js";
        const source = `import * as A from "./b.ts";`;

        const graph: Graph = {
          [input]: {
            [DependencyType.Import]: {
              filePath: input,
              output: bundleOutput,
              dependencies: {
                imports: {
                  [dependency]: {
                    specifiers: {},
                    defaults: [],
                    namespaces: [],
                    type: DependencyType.Import,
                    format: Format.Script,
                  },
                },
                exports: {},
              },
              format: Format.Script,
            },
          },
          [dependency]: {
            [DependencyType.Import]: {
              filePath: dependency,
              output: dependencyOutput,
              dependencies: { imports: {}, exports: {} },
              format: Format.Script,
            },
          },
        };
        const chunk: Chunk = {
          history: [input],
          type: DependencyType.Import,
          format: Format.Script,
          dependencies: [
            {
              history: [dependency],
              type: DependencyType.Import,
              format: Format.Script,
            },
          ],
        };

        const sourceFile = ts.createSourceFile(
          input,
          source,
          ts.ScriptTarget.Latest,
        );
        const transformers = [
          typescriptInjectDependenciesTranformer(
            chunk,
            { graph, importMap },
          ),
        ];
        const { diagnostics, transformed } = ts.transform(
          sourceFile,
          transformers,
          compilerOptions,
        );
        const outputText = printer.printFile(transformed[0]);

        assertEquals(diagnostics, []);
        assertStringIncludes(outputText, `import * as A from "./b.js";`);
      },
    },
    {
      name: "named import",
      fn() {
        const importMap: ImportMap = { imports: {} };
        const input = "src/a.ts";
        const bundleOutput = "dist/a.js";
        const dependency = "src/b.ts";
        const dependencyOutput = "dist/b.js";
        const source = `import { A, B } from "./b.ts";`;

        const graph: Graph = {
          [input]: {
            [DependencyType.Import]: {
              filePath: input,
              output: bundleOutput,
              dependencies: {
                imports: {
                  [dependency]: {
                    specifiers: {},
                    defaults: [],
                    namespaces: [],
                    type: DependencyType.Import,
                    format: Format.Script,
                  },
                },
                exports: {},
              },
              format: Format.Script,
            },
          },
          [dependency]: {
            [DependencyType.Import]: {
              filePath: dependency,
              output: dependencyOutput,
              dependencies: { imports: {}, exports: {} },
              format: Format.Script,
            },
          },
        };
        const chunk: Chunk = {
          history: [input],
          type: DependencyType.Import,
          format: Format.Script,
          dependencies: [
            {
              history: [dependency],
              type: DependencyType.Import,
              format: Format.Script,
            },
          ],
        };

        const sourceFile = ts.createSourceFile(
          input,
          source,
          ts.ScriptTarget.Latest,
        );
        const transformers = [
          typescriptInjectDependenciesTranformer(
            chunk,
            { graph, importMap },
          ),
        ];
        const { diagnostics, transformed } = ts.transform(
          sourceFile,
          transformers,
          compilerOptions,
        );
        const outputText = printer.printFile(transformed[0]);
        assertEquals(diagnostics, []);
        assertStringIncludes(outputText, ``);
      },
    },
    {
      name: "default import",
      fn() {
        const importMap: ImportMap = { imports: {} };
        const input = "src/a.ts";
        const bundleOutput = "dist/a.js";
        const dependency = "src/b.ts";
        const dependencyOutput = "dist/b.js";
        const source = `import A from "./b.ts";`;

        const graph: Graph = {
          [input]: {
            [DependencyType.Import]: {
              filePath: input,
              output: bundleOutput,
              dependencies: {
                imports: {
                  [dependency]: {
                    specifiers: {},
                    defaults: [],
                    namespaces: [],
                    type: DependencyType.Import,
                    format: Format.Script,
                  },
                },
                exports: {},
              },
              format: Format.Script,
            },
          },
          [dependency]: {
            [DependencyType.Import]: {
              filePath: dependency,
              output: dependencyOutput,
              dependencies: { imports: {}, exports: {} },
              format: Format.Script,
            },
          },
        };
        const chunk: Chunk = {
          history: [input],
          type: DependencyType.Import,
          format: Format.Script,
          dependencies: [
            {
              history: [dependency],
              type: DependencyType.Import,
              format: Format.Script,
            },
          ],
        };

        const sourceFile = ts.createSourceFile(
          input,
          source,
          ts.ScriptTarget.Latest,
        );
        const transformers = [
          typescriptInjectDependenciesTranformer(
            chunk,
            { graph, importMap },
          ),
        ];
        const { diagnostics, transformed } = ts.transform(
          sourceFile,
          transformers,
          compilerOptions,
        );
        const outputText = printer.printFile(transformed[0]);
        assertEquals(diagnostics, []);
        assertStringIncludes(outputText, ``);
      },
    },
    {
      name: "module specifier import",
      fn() {
        const importMap: ImportMap = { imports: {} };
        const input = "src/a.ts";
        const bundleOutput = "dist/a.js";
        const dependency = "src/b.ts";
        const dependencyOutput = "dist/b.js";
        const source = `import "./b.ts";`;

        const graph: Graph = {
          [input]: {
            [DependencyType.Import]: {
              filePath: input,
              output: bundleOutput,
              dependencies: {
                imports: {
                  [dependency]: {
                    specifiers: {},
                    defaults: [],
                    namespaces: [],
                    type: DependencyType.Import,
                    format: Format.Script,
                  },
                },
                exports: {},
              },
              format: Format.Script,
            },
          },
          [dependency]: {
            [DependencyType.Import]: {
              filePath: dependency,
              output: dependencyOutput,
              dependencies: { imports: {}, exports: {} },
              format: Format.Script,
            },
          },
        };
        const chunk: Chunk = {
          history: [input],
          type: DependencyType.Import,
          format: Format.Script,
          dependencies: [
            {
              history: [dependency],
              type: DependencyType.Import,
              format: Format.Script,
            },
          ],
        };

        const sourceFile = ts.createSourceFile(
          input,
          source,
          ts.ScriptTarget.Latest,
        );
        const transformers = [
          typescriptInjectDependenciesTranformer(
            chunk,
            { graph, importMap },
          ),
        ];
        const { diagnostics, transformed } = ts.transform(
          sourceFile,
          transformers,
          compilerOptions,
        );
        const outputText = printer.printFile(transformed[0]);
        assertEquals(diagnostics, []);
        assertStringIncludes(outputText, ``);
      },
    },
    {
      name: "dynamic import",
      fn() {
        const importMap: ImportMap = { imports: {} };
        const input = "src/a.ts";
        const bundleOutput = "dist/a.js";
        const dependency = "src/b.ts";
        const dependencyOutput = "dist/b.js";
        const source = `import("./b.ts");`;

        const graph: Graph = {
          [input]: {
            [DependencyType.Import]: {
              filePath: input,
              output: bundleOutput,
              dependencies: {
                imports: {
                  [dependency]: {
                    specifiers: {},
                    defaults: [],
                    namespaces: [],
                    type: DependencyType.DynamicImport,
                    format: Format.Script,
                  },
                },
                exports: {},
              },
              format: Format.Script,
            },
          },
          [dependency]: {
            [DependencyType.DynamicImport]: {
              filePath: dependency,
              output: dependencyOutput,
              dependencies: { imports: {}, exports: {} },
              format: Format.Script,
            },
          },
        };
        const chunk: Chunk = {
          history: [input],
          type: DependencyType.Import,
          format: Format.Script,
          dependencies: [
            {
              history: [dependency],
              type: DependencyType.Import,
              format: Format.Script,
            },
          ],
        };

        const sourceFile = ts.createSourceFile(
          input,
          source,
          ts.ScriptTarget.Latest,
        );
        const transformers = [
          typescriptInjectDependenciesTranformer(
            chunk,
            { graph, importMap },
          ),
        ];
        const { diagnostics, transformed } = ts.transform(
          sourceFile,
          transformers,
          compilerOptions,
        );
        const outputText = printer.printFile(transformed[0]);
        assertEquals(diagnostics, []);
        assertStringIncludes(outputText, `import("./b.js");`);
      },
    },
    {
      name: "dynamic import warn",
      fn() {
        const importMap: ImportMap = { imports: {} };
        const input = "src/a.ts";
        const bundleOutput = "dist/a.js";
        const dependency = "src/b.ts";
        const dependencyOutput = "dist/b.js";
        const source = `import("./" + "b.ts");`;

        const graph: Graph = {
          [input]: {
            [DependencyType.Import]: {
              filePath: input,
              output: bundleOutput,
              dependencies: {
                imports: {
                  [dependency]: {
                    specifiers: {},
                    defaults: [],
                    namespaces: [],
                    type: DependencyType.Import,
                    format: Format.Script,
                  },
                },
                exports: {},
              },
              format: Format.Script,
            },
          },
          [dependency]: {
            [DependencyType.Import]: {
              filePath: dependency,
              output: dependencyOutput,
              dependencies: { imports: {}, exports: {} },
              format: Format.Script,
            },
          },
        };
        const chunk: Chunk = {
          history: [input],
          type: DependencyType.Import,
          format: Format.Script,
          dependencies: [
            {
              history: [dependency],
              type: DependencyType.Import,
              format: Format.Script,
            },
          ],
        };

        const sourceFile = ts.createSourceFile(
          input,
          source,
          ts.ScriptTarget.Latest,
        );
        const transformers = [
          typescriptInjectDependenciesTranformer(
            chunk,
            { graph, importMap },
          ),
        ];
        const { diagnostics, transformed } = ts.transform(
          sourceFile,
          transformers,
          compilerOptions,
        );
        const outputText = printer.printFile(transformed[0]);
        assertEquals(diagnostics, []);
        assertStringIncludes(outputText, `import("./" + "b.ts");`);
      },
    },
    {
      name: "type export",
      fn() {
        const importMap: ImportMap = { imports: {} };
        const input = "src/a.ts";
        const bundleOutput = "dist/a.js";
        const dependency = "src/b.ts";
        const dependencyOutput = "dist/b.js";
        const source = `export type { A } from "./b.ts";`;

        const graph: Graph = {
          [input]: {
            [DependencyType.Import]: {
              filePath: input,
              output: bundleOutput,
              dependencies: {
                imports: {
                  [dependency]: {
                    specifiers: { "A": "A" },
                    defaults: [],
                    namespaces: [],
                    type: DependencyType.Export,
                    format: Format.Script,
                  },
                },
                exports: {},
              },
              format: Format.Script,
            },
          },
          [dependency]: {
            [DependencyType.Export]: {
              filePath: dependency,
              output: dependencyOutput,
              dependencies: { imports: {}, exports: {} },
              format: Format.Script,
            },
          },
        };
        const chunk: Chunk = {
          history: [input],
          type: DependencyType.Import,
          format: Format.Script,
          dependencies: [
            {
              history: [dependency],
              type: DependencyType.Import,
              format: Format.Script,
            },
          ],
        };

        const sourceFile = ts.createSourceFile(
          input,
          source,
          ts.ScriptTarget.Latest,
        );
        const transformers = [
          typescriptInjectDependenciesTranformer(
            chunk,
            { graph, importMap },
          ),
        ];
        const { diagnostics, transformed } = ts.transform(
          sourceFile,
          transformers,
          compilerOptions,
        );
        const outputText = printer.printFile(transformed[0]);
        assertEquals(diagnostics, []);
        assertStringIncludes(outputText, `export type { A } from "./b.js";`);
      },
    },
    {
      name: "namespace export",
      fn() {
        const importMap: ImportMap = { imports: {} };
        const input = "src/a.ts";
        const bundleOutput = "dist/a.js";
        const dependency = "src/b.ts";
        const dependencyOutput = "dist/b.js";
        const source = `export * from "./b.ts";`;

        const graph: Graph = {
          [input]: {
            [DependencyType.Import]: {
              filePath: input,
              output: bundleOutput,
              dependencies: {
                imports: {
                  [dependency]: {
                    specifiers: {},
                    defaults: [],
                    namespaces: [undefined],
                    type: DependencyType.Export,
                    format: Format.Script,
                  },
                },
                exports: {},
              },
              format: Format.Script,
            },
          },
          [dependency]: {
            [DependencyType.Export]: {
              filePath: dependency,
              output: dependencyOutput,
              dependencies: { imports: {}, exports: {} },
              format: Format.Script,
            },
          },
        };
        const chunk: Chunk = {
          history: [input],
          type: DependencyType.Import,
          format: Format.Script,
          dependencies: [
            {
              history: [dependency],
              type: DependencyType.Import,
              format: Format.Script,
            },
          ],
        };

        const sourceFile = ts.createSourceFile(
          input,
          source,
          ts.ScriptTarget.Latest,
        );
        const transformers = [
          typescriptInjectDependenciesTranformer(
            chunk,
            { graph, importMap },
          ),
        ];
        const { diagnostics, transformed } = ts.transform(
          sourceFile,
          transformers,
          compilerOptions,
        );
        const outputText = printer.printFile(transformed[0]);
        assertEquals(diagnostics, []);
        assertStringIncludes(outputText, `export * from "./b.js";`);
      },
    },
    {
      name: "namespace alias export",
      fn() {
        const importMap: ImportMap = { imports: {} };
        const input = "src/a.ts";
        const bundleOutput = "dist/a.js";
        const dependency = "src/b.ts";
        const dependencyOutput = "dist/b.js";
        const source = `export * as b from "./b.ts";`;

        const graph: Graph = {
          [input]: {
            [DependencyType.Import]: {
              filePath: input,
              output: bundleOutput,
              dependencies: {
                imports: {
                  [dependency]: {
                    specifiers: {},
                    defaults: [],
                    namespaces: [],
                    type: DependencyType.Export,
                    format: Format.Script,
                  },
                },
                exports: {},
              },
              format: Format.Script,
            },
          },
          [dependency]: {
            [DependencyType.Export]: {
              filePath: dependency,
              output: dependencyOutput,
              dependencies: { imports: {}, exports: {} },
              format: Format.Script,
            },
          },
        };
        const chunk: Chunk = {
          history: [input],
          type: DependencyType.Import,
          format: Format.Script,
          dependencies: [
            {
              history: [dependency],
              type: DependencyType.Import,
              format: Format.Script,
            },
          ],
        };

        const sourceFile = ts.createSourceFile(
          input,
          source,
          ts.ScriptTarget.Latest,
        );
        const transformers = [
          typescriptInjectDependenciesTranformer(
            chunk,
            { graph, importMap },
          ),
        ];
        const { diagnostics, transformed } = ts.transform(
          sourceFile,
          transformers,
          compilerOptions,
        );
        const outputText = printer.printFile(transformed[0]);
        assertEquals(diagnostics, []);
        assertStringIncludes(
          outputText,
          `export * as b from "./b.js";`,
        );
      },
    },
    {
      name: "forward named export",
      fn() {
        const importMap: ImportMap = { imports: {} };
        const input = "src/a.ts";
        const bundleOutput = "dist/a.js";
        const dependency = "src/b.ts";
        const dependencyOutput = "dist/b.js";
        const source = `export { a, b } from "./b.ts"`;

        const graph: Graph = {
          [input]: {
            [DependencyType.Import]: {
              filePath: input,
              output: bundleOutput,
              dependencies: {
                imports: {
                  [dependency]: {
                    specifiers: {},
                    defaults: [],
                    namespaces: [],
                    type: DependencyType.Export,
                    format: Format.Script,
                  },
                },
                exports: {},
              },
              format: Format.Script,
            },
          },
          [dependency]: {
            [DependencyType.Export]: {
              filePath: dependency,
              output: dependencyOutput,
              dependencies: { imports: {}, exports: {} },
              format: Format.Script,
            },
          },
        };
        const chunk: Chunk = {
          history: [input],
          type: DependencyType.Import,
          format: Format.Script,
          dependencies: [
            {
              history: [dependency],
              type: DependencyType.Import,
              format: Format.Script,
            },
          ],
        };

        const sourceFile = ts.createSourceFile(
          input,
          source,
          ts.ScriptTarget.Latest,
        );
        const transformers = [
          typescriptInjectDependenciesTranformer(
            chunk,
            { graph, importMap },
          ),
        ];
        const { diagnostics, transformed } = ts.transform(
          sourceFile,
          transformers,
          compilerOptions,
        );
        const outputText = printer.printFile(transformed[0]);
        assertEquals(diagnostics, []);
        assertStringIncludes(outputText, `export { a, b } from "./b.js";`);
      },
    },
    {
      name: "WebWorker",
      fn() {
        const importMap: ImportMap = { imports: {} };
        const input = "src/a.ts";
        const bundleOutput = "dist/a.js";
        const dependency = "src/b.ts";
        const dependencyOutput = "dist/b.js";
        const source = `const worker = new Worker("./b.ts")`;

        const graph: Graph = {
          [input]: {
            [DependencyType.Import]: {
              filePath: input,
              output: bundleOutput,
              dependencies: {
                imports: {
                  [dependency]: {
                    specifiers: {},
                    defaults: [],
                    namespaces: [],
                    type: DependencyType.WebWorker,
                    format: Format.Script,
                  },
                },
                exports: {},
              },
              format: Format.Script,
            },
          },
          [dependency]: {
            [DependencyType.WebWorker]: {
              filePath: dependency,
              output: dependencyOutput,
              dependencies: { imports: {}, exports: {} },
              format: Format.Script,
            },
          },
        };
        const chunk: Chunk = {
          history: [input],
          type: DependencyType.Import,
          format: Format.Script,
          dependencies: [
            {
              history: [dependency],
              type: DependencyType.Import,
              format: Format.Script,
            },
          ],
        };

        const sourceFile = ts.createSourceFile(
          input,
          source,
          ts.ScriptTarget.Latest,
        );
        const transformers = [
          typescriptInjectDependenciesTranformer(
            chunk,
            { graph, importMap },
          ),
        ];
        const { diagnostics, transformed } = ts.transform(
          sourceFile,
          transformers,
          compilerOptions,
        );
        const outputText = printer.printFile(transformed[0]);
        assertEquals(diagnostics, []);
        assertStringIncludes(
          outputText,
          `const worker = new Worker("./b.js");`,
        );
      },
    },
    {
      name: "fetch",
      fn() {
        const importMap: ImportMap = { imports: {} };
        const input = "src/a.ts";
        const bundleOutput = "dist/a.js";
        const dependency = "src/b.ts";
        const dependencyOutput = "dist/b.js";
        const source = `fetch("./b.ts")`;

        const graph: Graph = {
          [input]: {
            [DependencyType.Import]: {
              filePath: input,
              output: bundleOutput,
              dependencies: {
                imports: {
                  [dependency]: {
                    specifiers: {},
                    defaults: [],
                    namespaces: [],
                    type: DependencyType.Fetch,
                    format: Format.Script,
                  },
                },
                exports: {},
              },
              format: Format.Script,
            },
          },
          [dependency]: {
            [DependencyType.Fetch]: {
              filePath: dependency,
              output: dependencyOutput,
              dependencies: { imports: {}, exports: {} },
              format: Format.Script,
            },
          },
        };
        const chunk: Chunk = {
          history: [input],
          type: DependencyType.Import,
          format: Format.Script,
          dependencies: [
            {
              history: [dependency],
              type: DependencyType.Fetch,
              format: Format.Script,
            },
          ],
        };

        const sourceFile = ts.createSourceFile(
          input,
          source,
          ts.ScriptTarget.Latest,
        );
        const transformers = [
          typescriptInjectDependenciesTranformer(
            chunk,
            { graph, importMap },
          ),
        ];
        const { diagnostics, transformed } = ts.transform(
          sourceFile,
          transformers,
          compilerOptions,
        );
        const outputText = printer.printFile(transformed[0]);
        assertEquals(diagnostics, []);
        assertStringIncludes(outputText, `fetch("./b.js")`);
      },
    },
    {
      name: "fetch level down",
      fn() {
        const importMap: ImportMap = { imports: {} };
        const input = "src/a.ts";
        const bundleOutput = "a.js";
        const dependency = "src/b.ts";
        const dependencyOutput = "dist/b.js";
        const source = `fetch("./b.ts")`;

        const graph: Graph = {
          [input]: {
            [DependencyType.Import]: {
              filePath: input,
              output: bundleOutput,
              dependencies: {
                imports: {
                  [dependency]: {
                    specifiers: {},
                    defaults: [],
                    namespaces: [],
                    type: DependencyType.Fetch,
                    format: Format.Script,
                  },
                },
                exports: {},
              },
              format: Format.Script,
            },
          },
          [dependency]: {
            [DependencyType.Fetch]: {
              filePath: dependency,
              output: dependencyOutput,
              dependencies: { imports: {}, exports: {} },
              format: Format.Script,
            },
          },
        };
        const chunk: Chunk = {
          history: [input],
          type: DependencyType.Import,
          format: Format.Script,
          dependencies: [
            {
              history: [dependency],
              type: DependencyType.Fetch,
              format: Format.Script,
            },
          ],
        };

        const sourceFile = ts.createSourceFile(
          input,
          source,
          ts.ScriptTarget.Latest,
        );
        const transformers = [
          typescriptInjectDependenciesTranformer(
            chunk,
            { graph, importMap },
          ),
        ];
        const { diagnostics, transformed } = ts.transform(
          sourceFile,
          transformers,
          compilerOptions,
        );
        const outputText = printer.printFile(transformed[0]);
        assertEquals(diagnostics, []);
        assertStringIncludes(outputText, `fetch("./dist/b.js")`);
      },
    },
    {
      name: "fetch level up",
      fn() {
        const importMap: ImportMap = { imports: {} };
        const input = "src/a.ts";
        const bundleOutput = "dist/a.js";
        const dependency = "src/b.ts";
        const dependencyOutput = "b.js";
        const source = `fetch("./b.ts")`;

        const graph: Graph = {
          [input]: {
            [DependencyType.Import]: {
              filePath: input,
              output: bundleOutput,
              dependencies: {
                imports: {
                  [dependency]: {
                    specifiers: {},
                    defaults: [],
                    namespaces: [],
                    type: DependencyType.Fetch,
                    format: Format.Script,
                  },
                },
                exports: {},
              },
              format: Format.Script,
            },
          },
          [dependency]: {
            [DependencyType.Fetch]: {
              filePath: dependency,
              output: dependencyOutput,
              dependencies: { imports: {}, exports: {} },
              format: Format.Script,
            },
          },
        };
        const chunk: Chunk = {
          history: [input],
          type: DependencyType.Import,
          format: Format.Script,
          dependencies: [
            {
              history: [dependency],
              type: DependencyType.Import,
              format: Format.Script,
            },
          ],
        };

        const sourceFile = ts.createSourceFile(
          input,
          source,
          ts.ScriptTarget.Latest,
        );
        const transformers = [
          typescriptInjectDependenciesTranformer(
            chunk,
            { graph, importMap },
          ),
        ];
        const { diagnostics, transformed } = ts.transform(
          sourceFile,
          transformers,
          compilerOptions,
        );
        const outputText = printer.printFile(transformed[0]);
        assertEquals(diagnostics, []);
        assertStringIncludes(outputText, `fetch("../b.js")`);
      },
    },
    {
      name: "ServiceWorker",
      fn() {
        const importMap: ImportMap = { imports: {} };
        const input = "src/a.ts";
        const bundleOutput = "dist/a.js";
        const dependency = "src/b.ts";
        const dependencyOutput = "dist/b.js";
        const source = `navigator.serviceWorker.register("./b.ts")`;

        const graph: Graph = {
          [input]: {
            [DependencyType.Import]: {
              filePath: input,
              output: bundleOutput,
              dependencies: {
                imports: {
                  [dependency]: {
                    specifiers: {},
                    defaults: [],
                    namespaces: [],
                    type: DependencyType.ServiceWorker,
                    format: Format.Script,
                  },
                },
                exports: {},
              },
              format: Format.Script,
            },
          },
          [dependency]: {
            [DependencyType.ServiceWorker]: {
              filePath: dependency,
              output: dependencyOutput,
              dependencies: { imports: {}, exports: {} },
              format: Format.Script,
            },
          },
        };
        const chunk: Chunk = {
          history: [input],
          type: DependencyType.Import,
          format: Format.Script,
          dependencies: [
            {
              history: [dependency],
              type: DependencyType.Import,
              format: Format.Script,
            },
          ],
        };

        const sourceFile = ts.createSourceFile(
          input,
          source,
          ts.ScriptTarget.Latest,
        );
        const transformers = [
          typescriptInjectDependenciesTranformer(
            chunk,
            { graph, importMap },
          ),
        ];
        const { diagnostics, transformed } = ts.transform(
          sourceFile,
          transformers,
          compilerOptions,
        );
        const outputText = printer.printFile(transformed[0]);
        assertEquals(diagnostics, []);
        assertStringIncludes(
          outputText,
          `navigator.serviceWorker.register("./b.js");`,
        );
      },
    },
  ],
});
