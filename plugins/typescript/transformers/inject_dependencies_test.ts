import { ImportMap, ts } from "../../../deps.ts";
import { Graph } from "../../../graph.ts";
import { assertEquals, assertStringIncludes } from "../../../test_deps.ts";
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

Deno.test({
  name: "[typescript inject dependencies transfomer] importMap",
  fn() {
    const importMap: ImportMap = { imports: { "src/": "custom/path/" } };
    const input = "src/a.ts";
    const bundleOutput = "dist/a.js";
    const dependency = "src/b.ts";
    const source = `import * as A from "./b.ts";`;

    const sourceFile = ts.createSourceFile(
      input,
      source,
      ts.ScriptTarget.Latest,
    );
    const graph: Graph = {
      [input]: {
        [DependencyType.Import]: {
          filePath: input,
          output: bundleOutput,
          dependencies: {
            imports: {
              [dependency]: {
                specifiers: [],
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
          output: bundleOutput,
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
    const transformers = {
      before: [
        typescriptInjectDependenciesTranformer(
          sourceFile,
          chunk,
          { graph, importMap },
        ),
      ],
    };

    const { diagnostics, outputText } = ts.transpileModule(
      source,
      {
        compilerOptions,
        transformers,
        reportDiagnostics: true,
      },
    );

    assertEquals(diagnostics, []);
    assertStringIncludes(outputText, `import * as A from "custom/path/b.ts";`);
  },
});

Deno.test({
  name: "[typescript inject dependencies transfomer] namespace import",
  fn() {
    const importMap: ImportMap = { imports: {} };
    const input = "src/a.ts";
    const bundleOutput = "dist/a.js";
    const dependency = "src/b.ts";
    const source = `import * as A from "./b.ts";`;

    const sourceFile = ts.createSourceFile(
      input,
      source,
      ts.ScriptTarget.Latest,
    );
    const graph: Graph = {
      [input]: {
        [DependencyType.Import]: {
          filePath: input,
          output: bundleOutput,
          dependencies: {
            imports: {
              [dependency]: {
                specifiers: [],
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
          output: bundleOutput,
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
    const transformers = {
      before: [
        typescriptInjectDependenciesTranformer(
          sourceFile,
          chunk,
          { graph, importMap },
        ),
      ],
    };

    const { diagnostics, outputText } = ts.transpileModule(
      source,
      {
        compilerOptions,
        transformers,
        reportDiagnostics: true,
      },
    );

    assertEquals(diagnostics, []);
    assertStringIncludes(outputText, `import * as A from "src/b.ts";`);
  },
});

Deno.test({
  name: "[typescript inject dependencies transfomer] named import",
  fn() {
    const importMap: ImportMap = { imports: {} };
    const input = "src/a.ts";
    const bundleOutput = "dist/a.js";
    const dependency = "src/b.ts";
    const source = `import { A, B } from "./b.ts";`;

    const sourceFile = ts.createSourceFile(
      input,
      source,
      ts.ScriptTarget.Latest,
    );
    const graph: Graph = {
      [input]: {
        [DependencyType.Import]: {
          filePath: input,
          output: bundleOutput,
          dependencies: {
            imports: {
              [dependency]: {
                specifiers: [],
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
          output: bundleOutput,
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
    const transformers = {
      before: [
        typescriptInjectDependenciesTranformer(
          sourceFile,
          chunk,
          { graph, importMap },
        ),
      ],
    };

    const { diagnostics, outputText } = ts.transpileModule(
      source,
      {
        compilerOptions,
        transformers,
        reportDiagnostics: true,
      },
    );
    assertEquals(diagnostics, []);
    assertStringIncludes(outputText, ``);
  },
});

Deno.test({
  name: "[typescript inject dependencies transfomer] default import",
  fn() {
    const importMap: ImportMap = { imports: {} };
    const input = "src/a.ts";
    const bundleOutput = "dist/a.js";
    const dependency = "src/b.ts";
    const source = `import A from "./b.ts";`;

    const sourceFile = ts.createSourceFile(
      input,
      source,
      ts.ScriptTarget.Latest,
    );
    const graph: Graph = {
      [input]: {
        [DependencyType.Import]: {
          filePath: input,
          output: bundleOutput,
          dependencies: {
            imports: {
              [dependency]: {
                specifiers: [],
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
          output: bundleOutput,
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
    const transformers = {
      before: [
        typescriptInjectDependenciesTranformer(
          sourceFile,
          chunk,
          { graph, importMap },
        ),
      ],
    };

    const { diagnostics, outputText } = ts.transpileModule(
      source,
      {
        compilerOptions,
        transformers,
        reportDiagnostics: true,
      },
    );
    assertEquals(diagnostics, []);
    assertStringIncludes(outputText, ``);
  },
});

Deno.test({
  name: "[typescript inject dependencies transfomer] module specifier import",
  fn() {
    const importMap: ImportMap = { imports: {} };
    const input = "src/a.ts";
    const bundleOutput = "dist/a.js";
    const dependency = "src/b.ts";
    const source = `import "./b.ts";`;

    const sourceFile = ts.createSourceFile(
      input,
      source,
      ts.ScriptTarget.Latest,
    );
    const graph: Graph = {
      [input]: {
        [DependencyType.Import]: {
          filePath: input,
          output: bundleOutput,
          dependencies: {
            imports: {
              [dependency]: {
                specifiers: [],
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
          output: bundleOutput,
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
    const transformers = {
      before: [
        typescriptInjectDependenciesTranformer(
          sourceFile,
          chunk,
          { graph, importMap },
        ),
      ],
    };

    const { diagnostics, outputText } = ts.transpileModule(
      source,
      {
        compilerOptions,
        transformers,
        reportDiagnostics: true,
      },
    );
    assertEquals(diagnostics, []);
    assertStringIncludes(outputText, ``);
  },
});

Deno.test({
  name: "[typescript inject dependencies transfomer] dynamic import",
  fn() {
    const importMap: ImportMap = { imports: {} };
    const input = "src/a.ts";
    const bundleOutput = "dist/a.js";
    const dependency = "src/b.ts";
    const dependencyOutput = "dist/b.js";
    const source = `import("./b.ts");`;

    const sourceFile = ts.createSourceFile(
      input,
      source,
      ts.ScriptTarget.Latest,
    );
    const graph: Graph = {
      [input]: {
        [DependencyType.Import]: {
          filePath: input,
          output: bundleOutput,
          dependencies: {
            imports: {
              [dependency]: {
                specifiers: [],
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
          type: DependencyType.Fetch,
          format: Format.Script,
        },
      ],
    };
    const transformers = {
      before: [
        typescriptInjectDependenciesTranformer(
          sourceFile,
          chunk,
          { graph, importMap },
        ),
      ],
    };

    const { diagnostics, outputText } = ts.transpileModule(
      source,
      {
        compilerOptions,
        transformers,
        reportDiagnostics: true,
      },
    );
    assertEquals(diagnostics, []);
    assertStringIncludes(outputText, `import("./b.js");`);
  },
});

Deno.test({
  name: "[typescript inject dependencies transfomer] dynamic import warn",
  fn() {
    const importMap: ImportMap = { imports: {} };
    const input = "src/a.ts";
    const bundleOutput = "dist/a.js";
    const dependency = "src/b.ts";
    const source = `import("./" + "b.ts");`;

    const sourceFile = ts.createSourceFile(
      input,
      source,
      ts.ScriptTarget.Latest,
    );
    const graph: Graph = {
      [input]: {
        [DependencyType.Import]: {
          filePath: input,
          output: bundleOutput,
          dependencies: {
            imports: {
              [dependency]: {
                specifiers: [],
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
          output: bundleOutput,
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
    const transformers = {
      before: [
        typescriptInjectDependenciesTranformer(
          sourceFile,
          chunk,
          { graph, importMap },
        ),
      ],
    };

    const { diagnostics, outputText } = ts.transpileModule(
      source,
      {
        compilerOptions,
        transformers,
        reportDiagnostics: true,
      },
    );
    assertEquals(diagnostics, []);
    assertStringIncludes(outputText, `import("./" + "b.ts");`);
  },
});

Deno.test({
  name: "[typescript inject dependencies transfomer] type export",
  fn() {
    const importMap: ImportMap = { imports: {} };
    const input = "src/a.ts";
    const bundleOutput = "dist/a.js";
    const dependency = "src/b.ts";
    const source = `export type { A } from "./b.ts";`;

    const sourceFile = ts.createSourceFile(
      input,
      source,
      ts.ScriptTarget.Latest,
    );
    const graph: Graph = {
      [input]: {
        [DependencyType.Import]: {
          filePath: input,
          output: bundleOutput,
          dependencies: {
            imports: {
              [dependency]: {
                specifiers: ["A"],
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
          output: bundleOutput,
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
    const transformers = {
      before: [
        typescriptInjectDependenciesTranformer(
          sourceFile,
          chunk,
          { graph, importMap },
        ),
      ],
    };

    const { diagnostics, outputText } = ts.transpileModule(
      source,
      {
        compilerOptions,
        transformers,
        reportDiagnostics: true,
      },
    );
    assertEquals(diagnostics, []);
    assertStringIncludes(outputText, `export {};`);
  },
});

Deno.test({
  name: "[typescript inject dependencies transfomer] namespace export",
  fn() {
    const importMap: ImportMap = { imports: {} };
    const input = "src/a.ts";
    const bundleOutput = "dist/a.js";
    const dependency = "src/b.ts";
    const source = `export * from "./b.ts";`;

    const sourceFile = ts.createSourceFile(
      input,
      source,
      ts.ScriptTarget.Latest,
    );
    const graph: Graph = {
      [input]: {
        [DependencyType.Import]: {
          filePath: input,
          output: bundleOutput,
          dependencies: {
            imports: {
              [dependency]: {
                specifiers: ["*"],
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
          output: bundleOutput,
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
    const transformers = {
      before: [
        typescriptInjectDependenciesTranformer(
          sourceFile,
          chunk,
          { graph, importMap },
        ),
      ],
    };

    const { diagnostics, outputText } = ts.transpileModule(
      source,
      {
        compilerOptions,
        transformers,
        reportDiagnostics: true,
      },
    );
    assertEquals(diagnostics, []);
    assertStringIncludes(outputText, `export * from "src/b.ts";`);
  },
});

Deno.test({
  name: "[typescript inject dependencies transfomer] namespace alias export",
  fn() {
    const importMap: ImportMap = { imports: {} };
    const input = "src/a.ts";
    const bundleOutput = "dist/a.js";
    const dependency = "src/b.ts";
    const source = `export * as b from "./b.ts";`;

    const sourceFile = ts.createSourceFile(
      input,
      source,
      ts.ScriptTarget.Latest,
    );
    const graph: Graph = {
      [input]: {
        [DependencyType.Import]: {
          filePath: input,
          output: bundleOutput,
          dependencies: {
            imports: {
              [dependency]: {
                specifiers: [],
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
          output: bundleOutput,
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
    const transformers = {
      before: [
        typescriptInjectDependenciesTranformer(
          sourceFile,
          chunk,
          { graph, importMap },
        ),
      ],
    };

    const { diagnostics, outputText } = ts.transpileModule(
      source,
      {
        compilerOptions,
        transformers,
        reportDiagnostics: true,
      },
    );
    assertEquals(diagnostics, []);
    assertStringIncludes(
      outputText,
      `import * as b_1 from "src/b.ts";\nexport { b_1 as b };`,
    );
  },
});

Deno.test({
  name: "[typescript inject dependencies transfomer] forward named export",
  fn() {
    const importMap: ImportMap = { imports: {} };
    const input = "src/a.ts";
    const bundleOutput = "dist/a.js";
    const dependency = "src/b.ts";
    const source = `export { a, b } from "./b.ts"`;

    const sourceFile = ts.createSourceFile(
      input,
      source,
      ts.ScriptTarget.Latest,
    );
    const graph: Graph = {
      [input]: {
        [DependencyType.Import]: {
          filePath: input,
          output: bundleOutput,
          dependencies: {
            imports: {
              [dependency]: {
                specifiers: [],
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
          output: bundleOutput,
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
    const transformers = {
      before: [
        typescriptInjectDependenciesTranformer(
          sourceFile,
          chunk,
          { graph, importMap },
        ),
      ],
    };

    const { diagnostics, outputText } = ts.transpileModule(
      source,
      {
        compilerOptions,
        transformers,
        reportDiagnostics: true,
      },
    );
    assertEquals(diagnostics, []);
    assertStringIncludes(outputText, `export { a, b } from "src/b.ts";`);
  },
});

Deno.test({
  name: "[typescript inject dependencies transfomer] WebWorker",
  fn() {
    const importMap: ImportMap = { imports: {} };
    const input = "src/a.ts";
    const bundleOutput = "dist/a.js";
    const dependency = "src/b.ts";
    const dependencyOutput = "dist/b.js";
    const source = `const worker = new Worker("./b.ts")`;

    const sourceFile = ts.createSourceFile(
      input,
      source,
      ts.ScriptTarget.Latest,
    );
    const graph: Graph = {
      [input]: {
        [DependencyType.Import]: {
          filePath: input,
          output: bundleOutput,
          dependencies: {
            imports: {
              [dependency]: {
                specifiers: [],
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
          type: DependencyType.Fetch,
          format: Format.Script,
        },
      ],
    };
    const transformers = {
      before: [
        typescriptInjectDependenciesTranformer(
          sourceFile,
          chunk,
          { graph, importMap },
        ),
      ],
    };

    const { diagnostics, outputText } = ts.transpileModule(
      source,
      {
        compilerOptions,
        transformers,
        reportDiagnostics: true,
      },
    );
    assertEquals(diagnostics, []);
    assertStringIncludes(outputText, `const worker = new Worker("./b.js");`);
  },
});

Deno.test({
  name: "[typescript inject dependencies transfomer] fetch",
  fn() {
    const importMap: ImportMap = { imports: {} };
    const input = "src/a.ts";
    const bundleOutput = "dist/a.js";
    const dependency = "src/b.ts";
    const dependencyOutput = "dist/b.js";
    const source = `fetch("./b.ts")`;

    const sourceFile = ts.createSourceFile(
      input,
      source,
      ts.ScriptTarget.Latest,
    );
    const graph: Graph = {
      [input]: {
        [DependencyType.Import]: {
          filePath: input,
          output: bundleOutput,
          dependencies: {
            imports: {
              [dependency]: {
                specifiers: [],
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
    const transformers = {
      before: [
        typescriptInjectDependenciesTranformer(
          sourceFile,
          chunk,
          { graph, importMap },
        ),
      ],
    };

    const { diagnostics, outputText } = ts.transpileModule(
      source,
      {
        compilerOptions,
        transformers,
        reportDiagnostics: true,
      },
    );
    assertEquals(diagnostics, []);
    assertStringIncludes(outputText, `fetch("./b.js")`);
  },
});

Deno.test({
  name: "[typescript inject dependencies transfomer] fetch level down",
  fn() {
    const importMap: ImportMap = { imports: {} };
    const input = "src/a.ts";
    const bundleOutput = "a.js";
    const dependency = "src/b.ts";
    const dependencyOutput = "dist/b.js";
    const source = `fetch("./b.ts")`;

    const sourceFile = ts.createSourceFile(
      input,
      source,
      ts.ScriptTarget.Latest,
    );
    const graph: Graph = {
      [input]: {
        [DependencyType.Import]: {
          filePath: input,
          output: bundleOutput,
          dependencies: {
            imports: {
              [dependency]: {
                specifiers: [],
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
    const transformers = {
      before: [
        typescriptInjectDependenciesTranformer(
          sourceFile,
          chunk,
          { graph, importMap },
        ),
      ],
    };

    const { diagnostics, outputText } = ts.transpileModule(
      source,
      {
        compilerOptions,
        transformers,
        reportDiagnostics: true,
      },
    );
    assertEquals(diagnostics, []);
    assertStringIncludes(outputText, `fetch("./dist/b.js")`);
  },
});

Deno.test({
  name: "[typescript inject dependencies transfomer] fetch level up",
  fn() {
    const importMap: ImportMap = { imports: {} };
    const input = "src/a.ts";
    const bundleOutput = "dist/a.js";
    const dependency = "src/b.ts";
    const dependencyOutput = "b.js";
    const source = `fetch("./b.ts")`;

    const sourceFile = ts.createSourceFile(
      input,
      source,
      ts.ScriptTarget.Latest,
    );
    const graph: Graph = {
      [input]: {
        [DependencyType.Import]: {
          filePath: input,
          output: bundleOutput,
          dependencies: {
            imports: {
              [dependency]: {
                specifiers: [],
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
    const transformers = {
      before: [
        typescriptInjectDependenciesTranformer(
          sourceFile,
          chunk,
          { graph, importMap },
        ),
      ],
    };

    const { diagnostics, outputText } = ts.transpileModule(
      source,
      {
        compilerOptions,
        transformers,
        reportDiagnostics: true,
      },
    );
    assertEquals(diagnostics, []);
    assertStringIncludes(outputText, `fetch("../b.js")`);
  },
});

Deno.test({
  name: "[typescript inject dependencies transfomer] ServiceWorker",
  fn() {
    const importMap: ImportMap = { imports: {} };
    const input = "src/a.ts";
    const bundleOutput = "dist/a.js";
    const dependency = "src/b.ts";
    const dependencyOutput = "dist/b.js";
    const source = `navigator.serviceWorker.register("./b.ts")`;

    const sourceFile = ts.createSourceFile(
      input,
      source,
      ts.ScriptTarget.Latest,
    );
    const graph: Graph = {
      [input]: {
        [DependencyType.Import]: {
          filePath: input,
          output: bundleOutput,
          dependencies: {
            imports: {
              [dependency]: {
                specifiers: [],
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
          type: DependencyType.Fetch,
          format: Format.Script,
        },
      ],
    };
    const transformers = {
      before: [
        typescriptInjectDependenciesTranformer(
          sourceFile,
          chunk,
          { graph, importMap },
        ),
      ],
    };

    const { diagnostics, outputText } = ts.transpileModule(
      source,
      {
        compilerOptions,
        transformers,
        reportDiagnostics: true,
      },
    );
    assertEquals(diagnostics, []);
    assertStringIncludes(
      outputText,
      `navigator.serviceWorker.register("./b.js");`,
    );
  },
});
