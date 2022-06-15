import { ts } from "../../../../deps.ts";
import { ConsoleLogger } from "../../../../log/console_logger.ts";
import { assertEquals } from "../../../../test_deps.ts";

import { Chunk, DependencyFormat, DependencyType } from "../../../plugin.ts";
import { injectDependencies } from "./inject_dependencies.ts";

const logger = new ConsoleLogger(ConsoleLogger.logLevels.debug);
logger.quiet = true;

const compilerOptions: ts.CompilerOptions = {
  newLine: ts.NewLineKind.LineFeed,
};

Deno.test({
  name: "update import moduleSpecifier",
  async fn(t) {
    await t.step({
      name: "type import",
      fn() {
        const source = `import type { a } from "./b.ts";`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: "export type a = string;",
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [
          {
            item: b,
            dependencyItems: [],
            output: "file:///dist/b.js",
          },
        ];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(result, ``);
      },
    });
    await t.step({
      name: "export → namespace import",
      fn() {
        const source = `import * as a from "./b.ts";`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export const a = "a";`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [],
          output: "file:///dist/a.js",
        };
        const chunks: Chunk[] = [
          {
            item: b,
            dependencyItems: [],
            output: "file:///dist/b.js",
          },
        ];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(result, `import * as a from "/b.js";\n`);
      },
    });
    await t.step({
      name: "export → named import",
      fn() {
        const source = `import { a, b } from "./b.ts";`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export const a = "a";, export const b = "b";`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [],
          output: "file:///dist/a.js",
        };
        const chunks: Chunk[] = [
          {
            item: b,
            dependencyItems: [],
            output: "file:///dist/b.js",
          },
        ];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(result, `import { a, b } from "/b.js";\n`);
      },
    });
    await t.step({
      name: "export → named alias import",
      fn() {
        const source = `import { a as x, a as y, b } from "./b.ts";`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: "export type a = string;",
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [
          {
            item: b,
            dependencyItems: [],
            output: "file:///dist/b.js",
          },
        ];
        const result = injectDependencies(
          chunk,
          { root, chunks, logger, compilerOptions },
        );

        assertEquals(
          result,
          `import { a as x, a as y, b } from "/b.js";\n`,
        );
      },
    });
    await t.step({
      name: "default export → default import",
      fn() {
        const source = `import A from "./b.ts";`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export const A = "a";`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [
          {
            item: b,
            dependencyItems: [],
            output: "file:///dist/b.js",
          },
        ];

        const result = injectDependencies(
          chunk,
          { root, chunks, logger, compilerOptions },
        );

        assertEquals(result, `import A from "/b.js";\n`);
      },
    });
    await t.step({
      name: "import",
      fn() {
        const source = `import "./b.ts";`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `console.log("hello world");`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [
          {
            item: b,
            dependencyItems: [],
            output: "file:///dist/b.js",
          },
        ];
        const result = injectDependencies(
          chunk,
          { root, chunks, logger, compilerOptions },
        );

        assertEquals(result, `import "/b.js";\n`);
      },
    });
    await t.step({
      name: "dynamic import",
      fn() {
        const source = `import("./b.ts");`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.DynamicImport,
          format: DependencyFormat.Script,
          source: `console.log("hello world");`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [
          {
            item: b,
            dependencyItems: [],
            output: "file:///dist/b.js",
          },
        ];
        const result = injectDependencies(
          chunk,
          { root, chunks, logger, compilerOptions },
        );

        assertEquals(result, `import("/b.js");\n`);
      },
    });
    await t.step({
      name: "dynamic import warn",
      fn() {
        const source = `import("./" + "b.ts");`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.DynamicImport,
          format: DependencyFormat.Script,
          source: `console.log("hello world");`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [
          {
            item: b,
            dependencyItems: [],
            output: "file:///dist/b.js",
          },
        ];
        const result = injectDependencies(
          chunk,
          { root, chunks, logger, compilerOptions },
        );

        assertEquals(result, `import("./" + "b.ts");\n`);
      },
    });
  },
});
Deno.test({
  name: "inline import source",
  async fn(t) {
    await t.step({
      name: "import",
      fn() {
        const source = `import "./b.ts";`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `console.log("hello world");`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(result, `console.log("hello world");\n`);
      },
    });
    await t.step({
      name: "double import",
      fn() {
        const source = `import "./b.ts"; import "./b.ts";`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `console.log("hello world");`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [];
        const result = injectDependencies(
          chunk,
          { root, chunks, logger, compilerOptions },
        );

        assertEquals(result, `console.log("hello world");\n`);
      },
    });
    await t.step({
      name: "import → import",
      fn() {
        const source = `import "./b.ts";`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `import "./c.ts";`,
        };
        const c = {
          input: "file:///src/c.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `console.log("hello world");`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b, c],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(result, `console.log("hello world");\n`);
      },
    });
    await t.step({
      name: "type import",
      fn() {
        const source = `import type { a } from "./b.ts"; type b = a;`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: "export type a = string;",
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(result, `type a = string;\ntype b = a;\n`);
      },
    });
    await t.step({
      name: "export → named import",
      fn() {
        const source = `import { b } from "./b.ts"; console.log(b);`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export const b = "b"`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const b = "b";\nconsole.log(b);\n`,
        );
      },
    });
    await t.step({
      name: "export → namespace export → named import",
      fn() {
        const source = `import { c } from "./b.ts"; console.log(c);`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export * from "./c.ts";`,
        };
        const c = {
          input: "file:///src/c.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export const c = "c"`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b, c],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const c = "c";\nconsole.log(c);\n`,
        );
      },
    });
    await t.step({
      name: "export → namespace alias export → named import",
      fn() {
        const source = `import { b } from "./b.ts"; console.log(b);`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export * as b from "./c.ts";`,
        };
        const c = {
          input: "file:///src/c.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export const c = "c"`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b, c],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const c = "c";\nconst mod = { c };\nconsole.log(mod);\n`,
        );
      },
    });
    await t.step({
      name: "alias export → namespace export → named import",
      fn() {
        const source = `import { c } from "./b.ts"; console.log(c);`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export * from "./c.ts";`,
        };
        const c = {
          input: "file:///src/c.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `const x = "x"; export { x as c }`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b, c],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const x = "x";\nconsole.log(x);\n`,
        );
      },
    });
    await t.step({
      name: "alias export → namespace export → named alias import",
      fn() {
        const source = `import { c as b } from "./b.ts"; console.log(b);`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export * from "./c.ts";`,
        };
        const c = {
          input: "file:///src/c.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `const x = "x"; export { x as c }`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b, c],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const x = "x";\nconsole.log(x);\n`,
        );
      },
    });
    await t.step({
      name: "alias export → named alias import identifier collision",
      fn() {
        const source =
          `import { b } from "./b.ts"; const x = "y"; console.log(b, x);`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export const x = "x" export { x as b };`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const x = "x";\nconst x1 = "y";\nconsole.log(x, x1);\n`,
        );
      },
    });
    await t.step({
      name: "export → named alias import",
      fn() {
        const source = `import { b as a } from "./b.ts"; console.log(a);`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export const b = "b";`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const b = "b";\nconsole.log(b);\n`,
        );
      },
    });
    await t.step({
      name: "alias export → named import",
      fn() {
        const source = `import { b as a } from "./b.ts"; console.log(a);`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `const x = "x"; export { x as b };`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const x = "x";\nconsole.log(x);\n`,
        );
      },
    });
    await t.step({
      name: "export → export → named import",
      fn() {
        const source = `import { b } from "./b.ts"; console.log(b);`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `import { b } from "./c.ts"; export { b }`,
        };
        const c = {
          input: "file:///src/c.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export const b = "b"`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b, c],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const b = "b";\nconsole.log(b);\n`,
        );
      },
    });
    await t.step({
      name: "alias export → alias export → named import",
      fn() {
        const source = `import { b } from "./b.ts"; console.log(b);`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `import { c } from "./c.ts"; export { c as b }`,
        };
        const c = {
          input: "file:///src/c.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `const x = "x" export { x as c }`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b, c],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const x = "x";\nconsole.log(x);\n`,
        );
      },
    });

    await t.step({
      name: "export → namespace import",
      fn() {
        const source = `import * as b from "./b.ts"; console.log(b);`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export const b = "b";`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };
        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const b = "b";\nconst mod = { b };\nconsole.log(mod);\n`,
        );
      },
    });
    await t.step({
      name: "export → export → namespace import",
      fn() {
        const source = `import * as b from "./b.ts"; console.log(b);`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `import * as c from "./c.ts"; export { c }`,
        };
        const c = {
          input: "file:///src/c.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export const c = "c";`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b, c],
          output: "file:///dist/a.js",
        };
        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const c = "c";\nconst mod = { c };\nconst mod1 = { c };\nconsole.log(mod1);\n`,
        );
      },
    });
    await t.step({
      name: "export → alias namespace export → namespace alias import",
      fn() {
        const source = `import * as b from "./b.ts"; console.log(b);`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `import * as c from "./c.ts"; export { c as x }`,
        };
        const c = {
          input: "file:///src/c.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export const c = "c";`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b, c],
          output: "file:///dist/a.js",
        };
        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const c = "c";\nconst mod = { c };\nconst mod1 = { x: c };\nconsole.log(mod1);\n`,
        );
      },
    });
    await t.step({
      name: "alias export → alias namespace export → namespace alias import",
      fn() {
        const source = `import * as b from "./b.ts"; console.log(b);`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `import * as c from "./c.ts"; export { c as x }`,
        };
        const c = {
          input: "file:///src/c.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `const x = "x"; export { x as c };`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b, c],
          output: "file:///dist/a.js",
        };
        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const x = "x";\nconst mod = { c: x };\nconst mod1 = { x: c };\nconsole.log(mod1);\n`,
        );
      },
    });
    await t.step({
      name: "export → namespace import identifier collision",
      fn() {
        const source =
          `import * as a from "./b.ts"; const b = "x"; console.log(a, b);`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export const b = "b";`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };
        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const b = "b";\nconst mod = { b };\nconst b1 = "x";\nconsole.log(mod, b1);\n`,
        );
      },
    });
    await t.step({
      name: "export → namespace import mod identifier collision",
      fn() {
        const source =
          `import * as b from "./b.ts"; const mod = "mod"; console.log(b, mod);`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export const b = "b";`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };
        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const b = "b";\nconst mod = { b };\nconst mod1 = "mod";\nconsole.log(mod, mod1);\n`,
        );
      },
    });
    await t.step({
      name: "export → namespace import mod identifier collision",
      fn() {
        const source = `import * as b from "./b.ts"; console.log(b);`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export const mod = "mod";`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };
        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const mod = "mod";\nconst mod1 = { mod };\nconsole.log(mod1);\n`,
        );
      },
    });

    await t.step({
      name: "default export → default import",
      fn() {
        const source = `import a from "./b.ts"; console.log(a);`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `const b = "b"; export default b;`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [];

        const result = injectDependencies(
          chunk,
          { root, chunks, logger, compilerOptions },
        );

        assertEquals(
          result,
          `const b = "b";\nconsole.log(b);\n`,
        );
      },
    });

    await t.step({
      name: "default export → default import alias",
      fn() {
        const source = `import a from "./b.ts"; console.log(a);`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `const b = "b"; export default b;`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [];

        const result = injectDependencies(
          chunk,
          { root, chunks, logger, compilerOptions },
        );

        assertEquals(
          result,
          `const b = "b";\nconsole.log(b);\n`,
        );
      },
    });

    await t.step({
      name: "default export → multiple default import alias",
      fn() {
        const source =
          `import "./b.ts"; import c from "./c.ts"; console.log("a", c);`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `import b from "./c.ts"; console.log("b", b);`,
        };
        const c = {
          input: "file:///src/c.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `const c = "c"; export default c;`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b, c],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [];

        const result = injectDependencies(
          chunk,
          { root, chunks, logger, compilerOptions },
        );

        assertEquals(
          result,
          `const c = "c";\nconsole.log("b", c);\nconsole.log("a", c);\n`,
        );
      },
    });

    await t.step({
      name: "dynamic import",
      fn() {
        const source = `import("./b.ts");`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.DynamicImport,
          format: DependencyFormat.Script,
          source: `console.log("hello world");`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [{
          item: b,
          dependencyItems: [],
          output: "file:///dist/b.js",
        }];
        const result = injectDependencies(
          chunk,
          { root, chunks, logger, compilerOptions },
        );

        assertEquals(result, `import("/b.js");\n`);
      },
    });
    await t.step({
      name: "dynamic import warn",
      fn() {
        const source = `import("./" + "b.ts");`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.DynamicImport,
          format: DependencyFormat.Script,
          source: `console.log("hello world");`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [{
          item: b,
          dependencyItems: [],
          output: "file:///dist/b.js",
        }];
        const result = injectDependencies(
          chunk,
          { root, chunks, logger, compilerOptions },
        );

        assertEquals(result, `import("./" + "b.ts");\n`);
      },
    });
  },
});

Deno.test({
  name: "update export moduleSpecifier",
  async fn(t) {
    await t.step({
      name: "type",
      fn() {
        const source = `export type { A } from "./b.ts";`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [],
          output: "file:///dist/a.js",
        };
        const chunks: Chunk[] = [];

        const result = injectDependencies(
          chunk,
          { root, chunks, logger, compilerOptions },
        );

        assertEquals(result, ``);
      },
    });
    await t.step({
      name: "interface",
      fn() {
        const source = `export interface A { };`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };

        const chunk: Chunk = {
          item: a,
          dependencyItems: [],
          output: "file:///dist/a.js",
        };
        const chunks: Chunk[] = [];

        const result = injectDependencies(
          chunk,
          { root, chunks, logger, compilerOptions },
        );

        assertEquals(
          result,
          `interface A {\n}\n;\nexport { A };\n`,
        );
      },
    });
    await t.step({
      name: "enum",
      fn() {
        const source = `export enum A { };`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };

        const chunk: Chunk = {
          item: a,
          dependencyItems: [],
          output: "file:///dist/a.js",
        };
        const chunks: Chunk[] = [];
        const result = injectDependencies(
          chunk,
          { root, chunks, logger, compilerOptions },
        );

        assertEquals(
          result,
          `enum A {\n}\n;\nexport { A };\n`,
        );
      },
    });
    await t.step({
      name: "namespace",
      fn() {
        const source = `export * from "./b.ts";`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export const b = "b";`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [],
          output: "file:///dist/a.js",
        };
        const chunks: Chunk[] = [
          {
            item: b,
            dependencyItems: [],
            output: "file:///dist/b.js",
          },
        ];
        const result = injectDependencies(
          chunk,
          { root, chunks, logger, compilerOptions },
        );

        assertEquals(result, `export * from "/b.js";\n`);
      },
    });
    await t.step({
      name: "named alias default",
      fn() {
        const source = `export { x as default };`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `const b = "b"; export default b;`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [],
          output: "file:///dist/a.js",
        };
        const chunks: Chunk[] = [
          {
            item: b,
            dependencyItems: [],
            output: "file:///dist/b.js",
          },
        ];
        const result = injectDependencies(
          chunk,
          { root, chunks, logger, compilerOptions },
        );

        assertEquals(result, `export { x as default };\n`);
      },
    });
    await t.step({
      name: "namespace alias",
      fn() {
        const source = `export * as b from "./b.ts";`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export const b = "b";`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [],
          output: "file:///dist/a.js",
        };
        const chunks: Chunk[] = [
          {
            item: b,
            dependencyItems: [],
            output: "file:///dist/b.js",
          },
        ];
        const result = injectDependencies(
          chunk,
          { root, chunks, logger, compilerOptions },
        );

        assertEquals(result, `export * as b from "/b.js";\n`);
      },
    });
    await t.step({
      name: "forward named",
      fn() {
        const source = `export { b } from "./b.ts"`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export const b = "b";`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [],
          output: "file:///dist/a.js",
        };
        const chunks: Chunk[] = [
          {
            item: b,
            dependencyItems: [],
            output: "file:///dist/b.js",
          },
        ];
        const result = injectDependencies(
          chunk,
          { root, chunks, logger, compilerOptions },
        );

        assertEquals(result, `export { b } from "/b.js";\n`);
      },
    });
  },
});
Deno.test({
  name: "inline export source",
  async fn(t) {
    await t.step({
      name: "type export",
      fn() {
        const source = `export type { b } from "./b.ts";`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: "export type b = string;",
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `type b = string;\nexport { b };\n`,
        );
      },
    });
    await t.step({
      name: "export → named export",
      fn() {
        const source = `export { b } from "./b.ts";`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export const b = "b";`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(result, `const b = "b";\nexport { b };\n`);
      },
    });
    await t.step({
      name: "export → named alias export",
      fn() {
        const source = `export { b as a } from "./b.ts";`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export const b = "b";`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const b = "b";\nexport { b as a };\n`,
        );
      },
    });
    await t.step({
      name: "alias export → named export",
      fn() {
        const source = `export { b } from "./b.ts";`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `const x = "x"; export { x as b };`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const x = "x";\nexport { x as b };\n`,
        );
      },
    });
    await t.step({
      name: "export → named alias export",
      fn() {
        const source = `export { b as a } from "./b.ts";`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `const b = "b"; export { b };`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const b = "b";\nexport { b as a };\n`,
        );
      },
    });
    await t.step({
      name: "alias export → named alias export",
      fn() {
        const source = `export { b as a } from "./b.ts";`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `const x = "x"; export { x as b };`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const x = "x";\nexport { x as a };\n`,
        );
      },
    });
    await t.step({
      name: "alias export → namespace export → named alias export",
      fn() {
        const source = `export { c as a } from "./b.ts";`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export * from "./c.ts`,
        };
        const c = {
          input: "file:///src/c.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `const x = "x"; export { x as c };`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b, c],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const x = "x";\nexport { x as a };\n`,
        );
      },
    });
    await t.step({
      name: "named alias export alias export",
      fn() {
        const source = `export { b as a } from "./b.ts";`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `const x = "x"; export { x as b };`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };

        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const x = "x";\nexport { x as a };\n`,
        );
      },
    });

    await t.step({
      name: "namespace export",
      fn() {
        const source = `export * from "./b.ts";`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export const b = "b";`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };
        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const b = "b";\nexport { b };\n`,
        );
      },
    });
    await t.step({
      name: "chain namespace export",
      fn() {
        const source = `export * from "./b.ts";`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export * from "./c.ts";`,
        };
        const c = {
          input: "file:///src/c.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export const c = "c";`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b, c],
          output: "file:///dist/a.js",
        };
        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const c = "c";\nexport { c };\n`,
        );
      },
    });
    await t.step({
      name: "chain namespace alias export",
      fn() {
        const source = `export * from "./b.ts";`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export * as b from "./c.ts";`,
        };
        const c = {
          input: "file:///src/c.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export const c = "c";`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b, c],
          output: "file:///dist/a.js",
        };
        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const c = "c";\nconst mod = { c };\nexport { mod as b };\n`,
        );
      },
    });

    await t.step({
      name: "alias export → namespace export",
      fn() {
        const source = `export * from "./b.ts";`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `const x = "x"; export { x as b }`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };
        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const x = "x";\nexport { x as b };\n`,
        );
      },
    });
    await t.step({
      name: "export → namespace export identifier collision",
      fn() {
        const source = `export * from "./b.ts"; const b = "a"; console.log(b);`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export const b = "b";`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };
        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const b = "b";\nconst b1 = "a";\nconsole.log(b1);\nexport { b };\n`,
        );
      },
    });
    await t.step({
      name: "export → mod identifier export collision",
      fn() {
        const source =
          `export * as b from "./b.ts"; const mod = "mod"; console.log(mod);`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export const b = "b";`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };
        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const b = "b";\nconst mod = { b };\nconst mod1 = "mod";\nconsole.log(mod1);\nexport { mod as b };\n`,
        );
      },
    });
    await t.step({
      name: "export → namespace alias export",
      fn() {
        const source = `export * as a from "./b.ts";`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export const b = "b";`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };
        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const b = "b";\nconst mod = { b };\nexport { mod as a };\n`,
        );
      },
    });
    await t.step({
      name: "export → named namespace export",
      fn() {
        const source = `export * as a from "./b.ts";`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source: `export const b = "b";`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };
        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });

        assertEquals(
          result,
          `const b = "b";\nconst mod = { b };\nexport { mod as a };\n`,
        );
      },
    });
  },
});

Deno.test({
  name: "WebWorker",
  fn() {
    const source = `const worker = new Worker("./b.ts")`;
    const root = "dist";
    const a = {
      input: "file:///src/a.ts",
      type: DependencyType.ImportExport,
      format: DependencyFormat.Script,
      source,
    };
    const b = {
      input: "file:///src/b.ts",
      type: DependencyType.WebWorker,
      format: DependencyFormat.Script,
      source: `console.log("hello world");`,
    };
    const chunk: Chunk = {
      item: a,
      dependencyItems: [],
      output: "file:///dist/a.js",
    };
    const chunks: Chunk[] = [
      {
        item: b,
        dependencyItems: [],
        output: "file:///dist/b.js",
      },
    ];
    const result = injectDependencies(
      chunk,
      { root, chunks, logger, compilerOptions },
    );
    assertEquals(result, `const worker = new Worker("/b.js");\n`);
  },
});
Deno.test({
  name: "fetch",
  fn() {
    const source = `fetch("./b.ts")`;
    const root = "dist";
    const a = {
      input: "file:///src/a.ts",
      type: DependencyType.ImportExport,
      format: DependencyFormat.Script,
      source,
    };
    const b = {
      input: "file:///src/b.ts",
      type: DependencyType.Fetch,
      format: DependencyFormat.Script,
      source: `console.log("hello world");`,
    };
    const chunk: Chunk = {
      item: a,
      dependencyItems: [],
      output: "file:///dist/a.js",
    };
    const chunks: Chunk[] = [
      {
        item: b,
        dependencyItems: [],
        output: "file:///dist/b.js",
      },
    ];

    const result = injectDependencies(
      chunk,
      { root, chunks, logger, compilerOptions },
    );
    assertEquals(result, `fetch("/b.js");\n`);
  },
});
Deno.test({
  name: "ServiceWorker",
  fn() {
    const source = `navigator.serviceWorker.register("./b.ts")`;
    const root = "dist";
    const a = {
      input: "file:///src/a.ts",
      type: DependencyType.ImportExport,
      format: DependencyFormat.Script,
      source,
    };
    const b = {
      input: "file:///src/b.ts",
      type: DependencyType.ServiceWorker,
      format: DependencyFormat.Script,
      source: `console.log("hello world");`,
    };
    const chunk: Chunk = {
      item: a,
      dependencyItems: [],
      output: "file:///dist/a.js",
    };
    const chunks: Chunk[] = [
      {
        item: b,
        dependencyItems: [],
        output: "file:///dist/b.js",
      },
    ];

    const result = injectDependencies(
      chunk,
      { root, chunks, logger, compilerOptions },
    );
    assertEquals(
      result,
      `navigator.serviceWorker.register("/b.js");\n`,
    );
  },
});
Deno.test({
  name: "json assertion import",
  async fn(t) {
    await t.step({
      name: "update moduleSpecifier",
      fn() {
        const source = `import json from "./b.json" assert { type: "json" }`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.json",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Json,
          source: `{ "foo": "bar" }`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [],
          output: "file:///dist/a.js",
        };
        const chunks: Chunk[] = [
          {
            item: b,
            dependencyItems: [],
            output: "file:///dist/b.json",
          },
        ];
        const result = injectDependencies(
          chunk,
          { root, chunks, logger, compilerOptions },
        );
        assertEquals(
          result,
          `import json from "/b.json" assert { type: "json" };\n`,
        );
      },
    });
    await t.step({
      name: "inline import",
      fn() {
        const source = `import json from "./b.json" assert { type: "json" }`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.json",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Json,
          source: `{ "foo": "bar" }`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };
        const chunks: Chunk[] = [];
        const result = injectDependencies(chunk, {
          root,
          chunks,
          logger,
          compilerOptions,
        });
        assertEquals(
          result,
          `const json = JSON.parse(\`{ "foo": "bar" }\`);\n`,
        );
      },
    });
  },
});
Deno.test({
  name: "css assertion import",
  async fn(t) {
    await t.step({
      name: "update moduleSpecifier",
      fn() {
        const source = `import css from "./b.css" assert { type: "css" }`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.css",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Style,
          source: `h1 { color: red; }`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [],
          output: "file:///dist/a.js",
        };
        const chunks: Chunk[] = [
          {
            item: b,
            dependencyItems: [],
            output: "file:///dist/b.css",
          },
        ];
        const result = injectDependencies(
          chunk,
          { root, chunks, logger, compilerOptions },
        );
        assertEquals(
          result,
          `import css from "/b.css" assert { type: "css" };\n`,
        );
      },
    });
    await t.step({
      name: "inline import",
      fn() {
        const source = `import css from "./b.css" assert { type: "css" }`;
        const root = "dist";
        const a = {
          input: "file:///src/a.ts",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        };
        const b = {
          input: "file:///src/b.css",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Style,
          source: `h1 { color: red; }`,
        };
        const chunk: Chunk = {
          item: a,
          dependencyItems: [b],
          output: "file:///dist/a.js",
        };
        const chunks: Chunk[] = [];
        const result = injectDependencies(
          chunk,
          { root, chunks, logger, compilerOptions },
        );
        assertEquals(
          result,
          `const css = new CSSStyleSheet();\ncss.replaceSync(\`h1 { color: red; }\`);\n`,
        );
      },
    });
  },
});
