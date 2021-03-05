import { ts } from "../../../deps.ts";
import { assertEquals } from "../../../test_deps.ts";
import { Dependencies, DependencyType, Format } from "../../plugin.ts";
import { typescriptExtractDependenciesTransformer } from "./extract_dependencies.ts";

const compilerOptions: ts.CompilerOptions = {};

Deno.test({
  name: "[typescript extract dependencies transfomer] type import",
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
      compilerOptions,
    );
    assertEquals(dependencies.imports, {});
    assertEquals(dependencies.exports, {});
  },
});

Deno.test({
  name: "[typescript extract dependencies transfomer] namespace import",
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
      compilerOptions,
    );
    assertEquals(dependencies.imports, {
      "./b.ts": {
        specifiers: ["*"],
        type: DependencyType.Import,
        format: Format.Script,
      },
    });
    assertEquals(dependencies.exports, {});
  },
});

Deno.test({
  name: "[typescript extract dependencies transfomer] named import",
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
      compilerOptions,
    );
    assertEquals(dependencies.imports, {
      "./b.ts": {
        specifiers: ["A", "B"],
        type: DependencyType.Import,
        format: Format.Script,
      },
    });
    assertEquals(dependencies.exports, {});
  },
});

Deno.test({
  name: "[typescript extract dependencies transfomer] named as import",
  fn() {
    const fileName = "src/a.ts";
    const sourceText = `import { A as X, B } from "./b.ts";`;

    const dependencies: Dependencies = { imports: {}, exports: {} };
    const sourceFile = ts.createSourceFile(
      fileName,
      sourceText,
      ts.ScriptTarget.Latest,
    );
    ts.transform(
      sourceFile,
      [typescriptExtractDependenciesTransformer(dependencies)],
      compilerOptions,
    );
    assertEquals(dependencies.imports, {
      "./b.ts": {
        specifiers: ["A", "B"],
        type: DependencyType.Import,
        format: Format.Script,
      },
    });
    assertEquals(dependencies.exports, {});
  },
});

Deno.test({
  name: "[typescript extract dependencies transfomer] default import",
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
      compilerOptions,
    );
    assertEquals(dependencies.imports, {
      "./b.ts": {
        specifiers: ["default"],
        type: DependencyType.Import,
        format: Format.Script,
      },
    });
    assertEquals(dependencies.exports, {});
  },
});

Deno.test({
  name: "[typescript extract dependencies transfomer] module specifier import",
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
      compilerOptions,
    );
    assertEquals(dependencies.imports, {
      "./b.ts": {
        specifiers: [],
        type: DependencyType.Import,
        format: Format.Script,
      },
    });
    assertEquals(dependencies.exports, {});
  },
});

Deno.test({
  name: "[typescript extract dependencies transfomer] dynamic import",
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
      compilerOptions,
    );
    assertEquals(dependencies.imports, {
      "./b.ts": {
        type: DependencyType.DynamicImport,
        format: Format.Script,
      },
    });
    assertEquals(dependencies.exports, {});
  },
});

Deno.test({
  name: "[typescript extract dependencies transfomer] dynamic import warn",
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
      compilerOptions,
    );
    assertEquals(dependencies.imports, {});
    assertEquals(dependencies.exports, {});
  },
});

Deno.test({
  name: "[typescript extract dependencies transfomer] type export",
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
      compilerOptions,
    );
    assertEquals(dependencies.imports, {});
    assertEquals(dependencies.exports, {});
  },
});

Deno.test({
  name: "[typescript extract dependencies transfomer] export interface",
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
      compilerOptions,
    );
    assertEquals(dependencies.imports, {});
    assertEquals(dependencies.exports, {});
  },
});

Deno.test({
  name: "[typescript extract dependencies transfomer] namespace export",
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
      compilerOptions,
    );
    assertEquals(dependencies.imports, {});
    assertEquals(dependencies.exports, {
      "./b.ts": {
        specifiers: ["*"],
        type: DependencyType.Export,
        format: Format.Script,
      },
    });
  },
});

Deno.test({
  name: "[typescript extract dependencies transfomer] namespace alias export",
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
      compilerOptions,
    );
    assertEquals(dependencies.imports, {});
    assertEquals(dependencies.exports, {
      "./b.ts": {
        specifiers: ["b"],
        type: DependencyType.Export,
        format: Format.Script,
      },
    });
  },
});

Deno.test({
  name: "[typescript extract dependencies transfomer] forward named export",
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
      compilerOptions,
    );
    assertEquals(dependencies.imports, {});
    assertEquals(dependencies.exports, {
      "./b.ts": {
        specifiers: ["a", "b"],
        type: DependencyType.Export,
        format: Format.Script,
      },
    });
  },
});

Deno.test({
  name: "[typescript extract dependencies transfomer] named export",
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
      compilerOptions,
    );

    assertEquals(dependencies.imports, {});
    assertEquals(dependencies.exports, {
      ".": {
        specifiers: ["a", "b"],
        type: DependencyType.Export,
        format: Format.Script,
      },
    });
  },
});

Deno.test({
  name: "[typescript extract dependencies transfomer] variable export",
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
      compilerOptions,
    );
    assertEquals(dependencies.imports, {});
    assertEquals(dependencies.exports, {
      ".": {
        specifiers: ["a"],
        type: DependencyType.Export,
        format: Format.Script,
      },
    });
  },
});

Deno.test({
  name: "[typescript extract dependencies transfomer] class export",
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
      compilerOptions,
    );
    assertEquals(dependencies.imports, {});
    assertEquals(dependencies.exports, {
      ".": {
        specifiers: ["A"],
        type: DependencyType.Export,
        format: Format.Script,
      },
    });
  },
});

Deno.test({
  name: "[typescript extract dependencies transfomer] function export",
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
      compilerOptions,
    );
    assertEquals(dependencies.imports, {});
    assertEquals(dependencies.exports, {
      ".": {
        specifiers: ["a"],
        type: DependencyType.Export,
        format: Format.Script,
      },
    });
  },
});

Deno.test({
  name:
    "[typescript extract dependencies transfomer] default assignment export",
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
      compilerOptions,
    );
    assertEquals(dependencies.imports, {});
    assertEquals(dependencies.exports, {
      ".": {
        specifiers: ["default"],
        type: DependencyType.Export,
        format: Format.Script,
      },
    });
  },
});

Deno.test({
  name: "[typescript extract dependencies transfomer] default function export",
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
      compilerOptions,
    );
    assertEquals(dependencies.imports, {});
    assertEquals(dependencies.exports, {
      ".": {
        specifiers: ["default"],
        type: DependencyType.Export,
        format: Format.Script,
      },
    });
  },
});

Deno.test({
  name: "[typescript extract dependencies transfomer] default class export",
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
      compilerOptions,
    );
    assertEquals(dependencies.imports, {});
    assertEquals(dependencies.exports, {
      ".": {
        specifiers: ["default"],
        type: DependencyType.Export,
        format: Format.Script,
      },
    });
  },
});

Deno.test({
  name: "[typescript extract dependencies transfomer] WebWorker",
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
      compilerOptions,
    );
    assertEquals(dependencies.imports, {
      "./b.ts": { type: DependencyType.WebWorker, format: Format.Script },
    });
    assertEquals(dependencies.exports, {});
  },
});

Deno.test({
  name: "[typescript extract dependencies transfomer] fetch",
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
      compilerOptions,
    );
    assertEquals(dependencies.imports, {
      "./b.ts": {
        type: DependencyType.Fetch,
        format: Format.Script,
      },
    });
    assertEquals(dependencies.exports, {});
  },
});

Deno.test({
  name: "[typescript extract dependencies transfomer] ServiceWorker",
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
      compilerOptions,
    );
    assertEquals(dependencies.imports, {
      "./b.ts": { type: DependencyType.ServiceWorker, format: Format.Script },
    });
    assertEquals(dependencies.exports, {});
  },
});
