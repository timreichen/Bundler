import { Bundler } from "../../bundler.ts";
import { ts } from "../../deps.ts";
import { assertEquals } from "../../test_deps.ts";
import { Chunk, DependencyFormat, DependencyType, Item } from "../plugin.ts";
import { injectDependencies } from "./inject_dependencies.ts";
import { parse, stringify } from "./_util.ts";

const compilerOptions: ts.CompilerOptions = {
  newLine: ts.NewLineKind.LineFeed,
};

Deno.test({
  name: "update import moduleSpecifier",
  async fn(t) {
    await t.step({
      name: "type import",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import type { a } from "./b.ts";`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = "export type a = string;";
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [];

        const chunks: Chunk[] = [
          {
            item: itemB,
            dependencyItems: [],
            output: "file:///dist/b.js",
          },
        ];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(stringify(result), ``);
      },
    });
    await t.step({
      name: "export → namespace import",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import * as a from "./b.ts";`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `export const a = "a";`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [];

        const chunks: Chunk[] = [
          {
            item: itemB,
            dependencyItems: [],
            output: "file:///dist/b.js",
          },
        ];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(stringify(result), `import * as a from "/b.js";\n`);
      },
    });
    await t.step({
      name: "export → named import",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import { a, b } from "./b.ts";`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `export const a = "a"; export const b = "b";`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [];

        const chunks: Chunk[] = [
          {
            item: itemB,
            dependencyItems: [],
            output: "file:///dist/b.js",
          },
        ];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(stringify(result), `import { a, b } from "/b.js";\n`);
      },
    });
    await t.step({
      name: "export → named alias import",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import { a as x, a as y, b } from "./b.ts";`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = "export type a = string;";
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [];

        const chunks: Chunk[] = [
          {
            item: itemB,
            dependencyItems: [],
            output: "file:///dist/b.js",
          },
        ];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `import { a as x, a as y, b } from "/b.js";\n`,
        );
      },
    });
    await t.step({
      name: "default export → default import",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import A from "./b.ts";`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `export const A = "a";`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [];

        const chunks: Chunk[] = [
          {
            item: itemB,
            dependencyItems: [],
            output: "file:///dist/b.js",
          },
        ];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(stringify(result), `import A from "/b.js";\n`);
      },
    });
    await t.step({
      name: "import",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import "./b.ts";`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `console.info("hello world");`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [];

        const chunks: Chunk[] = [
          {
            item: itemB,
            dependencyItems: [],
            output: "file:///dist/b.js",
          },
        ];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(stringify(result), `import "/b.js";\n`);
      },
    });
    await t.step({
      name: "dynamic import",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import("./b.ts");`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.DynamicImport,
          format: DependencyFormat.Script,
        };
        const sourceB = `console.info("hello world");`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [];

        const chunks: Chunk[] = [
          {
            item: itemB,
            dependencyItems: [],
            output: "file:///dist/b.js",
          },
        ];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.DynamicImport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(stringify(result), `import("/b.js");\n`);
      },
    });
    await t.step({
      name: "dynamic import warn",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import("./" + "b.ts");`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.DynamicImport,
          format: DependencyFormat.Script,
        };
        const sourceB = `console.info("hello world");`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [];

        const chunks: Chunk[] = [
          {
            item: itemB,
            dependencyItems: [],
            output: "file:///dist/b.js",
          },
        ];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.DynamicImport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(stringify(result), `import("./" + "b.ts");\n`);
      },
    });
  },
});
Deno.test({
  name: "inline import source",
  async fn(t) {
    await t.step({
      name: "import",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import "./b.ts";`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `console.info("hello world");`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];

        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(stringify(result), `console.info("hello world");\n`);
      },
    });
    await t.step({
      name: "double import",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import "./b.ts"; import "./b.ts";`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `console.info("hello world");`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];

        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(stringify(result), `console.info("hello world");\n`);
      },
    });
    await t.step({
      name: "import → import",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import "./b.ts";`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `import "./c.ts";`;
        const astB = parse(sourceB);

        const inputC = "file:///src/c.ts";
        const itemC = {
          input: inputC,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceC = `console.info("hello world");`;
        const astC = parse(sourceC);

        const dependencyItems: Item[] = [itemB, itemC];
        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );
        bundler.sourceMap.set(
          inputC,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astC,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(stringify(result), `console.info("hello world");\n`);
      },
    });
    await t.step({
      name: "type import",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import type { a } from "./b.ts"; type b = a;`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = "export type a = string;";
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];

        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(stringify(result), `type a = string;\ntype b = a;\n`);
      },
    });
    await t.step({
      name: "export → named import",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import { b } from "./b.ts"; console.info(b);`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `export const b = "b"`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];

        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const b = "b";\nconsole.info(b);\n`,
        );
      },
    });
    await t.step({
      name: "export → namespace export → named import",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import { c } from "./b.ts"; console.info(c);`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `export * from "./c.ts";`;
        const astB = parse(sourceB);

        const inputC = "file:///src/c.ts";
        const itemC = {
          input: inputC,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceC = `export const c = "c"`;
        const astC = parse(sourceC);

        const dependencyItems: Item[] = [itemB, itemC];
        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );
        bundler.sourceMap.set(
          inputC,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astC,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const c = "c";\nconsole.info(c);\n`,
        );
      },
    });
    await t.step({
      name: "export → namespace alias export → named import",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import { b } from "./b.ts"; console.info(b);`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `export * as b from "./c.ts";`;
        const astB = parse(sourceB);

        const inputC = "file:///src/c.ts";
        const itemC = {
          input: inputC,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceC = `export const c = "c"`;
        const astC = parse(sourceC);
        const dependencyItems: Item[] = [itemB, itemC];
        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );
        bundler.sourceMap.set(
          inputC,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astC,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const c = "c";\nconst mod = { c };\nconsole.info(mod);\n`,
        );
      },
    });
    await t.step({
      name: "alias export → namespace export → named import",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import { c } from "./b.ts"; console.info(c);`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `export * from "./c.ts";`;
        const astB = parse(sourceB);

        const inputC = "file:///src/c.ts";
        const itemC = {
          input: inputC,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceC = `const x = "x"; export { x as c }`;
        const astC = parse(sourceC);

        const dependencyItems: Item[] = [itemB, itemC];
        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );
        bundler.sourceMap.set(
          inputC,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astC,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const x = "x";\nconsole.info(x);\n`,
        );
      },
    });
    await t.step({
      name: "alias export → namespace export → named alias import",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import { c as b } from "./b.ts"; console.info(b);`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `export * from "./c.ts";`;
        const astB = parse(sourceB);

        const inputC = "file:///src/c.ts";
        const itemC = {
          input: inputC,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceC = `const x = "x"; export { x as c }`;
        const astC = parse(sourceC);

        const dependencyItems: Item[] = [itemB, itemC];
        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );
        bundler.sourceMap.set(
          inputC,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astC,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const x = "x";\nconsole.info(x);\n`,
        );
      },
    });
    await t.step({
      name: "alias export → named alias import identifier collision",
      async fn() {
        const root = "dist";
        const sourceA =
          `import { b } from "./b.ts"; const x = "y"; console.info(b, x);`;
        const inputA = "file:///src/a.ts";
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `export const x = "x" export { x as b };`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];

        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const x = "x";\nconst x1 = "y";\nconsole.info(x, x1);\n`,
        );
      },
    });
    await t.step({
      name: "export → named alias import",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import { b as a } from "./b.ts"; console.info(a);`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `export const b = "b";`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];

        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const b = "b";\nconsole.info(b);\n`,
        );
      },
    });
    await t.step({
      name: "alias export → named import",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import { b as a } from "./b.ts"; console.info(a);`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `const x = "x"; export { x as b };`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];

        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const x = "x";\nconsole.info(x);\n`,
        );
      },
    });
    await t.step({
      name: "export → export → named import",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import { b } from "./b.ts"; console.info(b);`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `import { b } from "./c.ts"; export { b }`;
        const astB = parse(sourceB);

        const inputC = "file:///src/c.ts";
        const itemC = {
          input: inputC,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceC = `export const b = "b"`;
        const astC = parse(sourceC);

        const dependencyItems: Item[] = [itemB, itemC];
        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );
        bundler.sourceMap.set(
          inputC,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astC,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const b = "b";\nconsole.info(b);\n`,
        );
      },
    });
    await t.step({
      name: "alias export → alias export → named import",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import { b } from "./b.ts"; console.info(b);`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `import { c } from "./c.ts"; export { c as b }`;
        const astB = parse(sourceB);

        const inputC = "file:///src/c.ts";
        const itemC = {
          input: inputC,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceC = `const x = "x" export { x as c }`;
        const astC = parse(sourceC);

        const dependencyItems: Item[] = [itemB, itemC];
        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );
        bundler.sourceMap.set(
          inputC,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astC,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const x = "x";\nconsole.info(x);\n`,
        );
      },
    });

    await t.step({
      name: "export → namespace import",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import * as b from "./b.ts"; console.info(b);`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `export const b = "b";`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];
        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const b = "b";\nconst mod = { b };\nconsole.info(mod);\n`,
        );
      },
    });
    await t.step({
      name: "export → export → namespace import",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import * as b from "./b.ts"; console.info(b);`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `import * as c from "./c.ts"; export { c }`;
        const astB = parse(sourceB);

        const inputC = "file:///src/c.ts";
        const itemC = {
          input: inputC,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceC = `export const c = "c";`;
        const astC = parse(sourceC);

        const dependencyItems: Item[] = [itemB, itemC];
        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );
        bundler.sourceMap.set(
          inputC,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astC,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const c = "c";\nconst mod = { c };\nconst mod1 = { c };\nconsole.info(mod1);\n`,
        );
      },
    });
    await t.step({
      name: "export → alias namespace export → namespace alias import",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import * as b from "./b.ts"; console.info(b);`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `import * as c from "./c.ts"; export { c as x }`;
        const astB = parse(sourceB);

        const inputC = "file:///src/c.ts";
        const itemC = {
          input: inputC,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceC = `export const c = "c";`;
        const astC = parse(sourceC);

        const dependencyItems: Item[] = [itemB, itemC];
        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );
        bundler.sourceMap.set(
          inputC,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astC,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const c = "c";\nconst mod = { c };\nconst mod1 = { x: c };\nconsole.info(mod1);\n`,
        );
      },
    });
    await t.step({
      name: "alias export → alias namespace export → namespace alias import",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import * as b from "./b.ts"; console.info(b);`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `import * as c from "./c.ts"; export { c as x }`;
        const astB = parse(sourceB);

        const inputC = "file:///src/c.ts";
        const itemC = {
          input: inputC,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceC = `const x = "x"; export { x as c };`;
        const astC = parse(sourceC);

        const dependencyItems: Item[] = [itemB, itemC];
        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );
        bundler.sourceMap.set(
          inputC,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astC,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const x = "x";\nconst mod = { c: x };\nconst mod1 = { x: c };\nconsole.info(mod1);\n`,
        );
      },
    });
    await t.step({
      name: "export → namespace import identifier collision",
      async fn() {
        const root = "dist";
        const sourceA =
          `import * as a from "./b.ts"; const b = "x"; console.info(a, b);`;
        const inputA = "file:///src/a.ts";
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `export const b = "b";`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];
        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const b = "b";\nconst mod = { b };\nconst b1 = "x";\nconsole.info(mod, b1);\n`,
        );
      },
    });
    await t.step({
      name: "export → namespace import mod identifier collision",
      async fn() {
        const root = "dist";
        const sourceA =
          `import * as b from "./b.ts"; const mod = "mod"; console.info(b, mod);`;
        const inputA = "file:///src/a.ts";
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `export const b = "b";`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];
        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const b = "b";\nconst mod = { b };\nconst mod1 = "mod";\nconsole.info(mod, mod1);\n`,
        );
      },
    });
    await t.step({
      name: "export → namespace import mod identifier collision",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import * as b from "./b.ts"; console.info(b);`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `export const mod = "mod";`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];
        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const mod = "mod";\nconst mod1 = { mod };\nconsole.info(mod1);\n`,
        );
      },
    });

    await t.step({
      name: "default export → default import",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import a from "./b.ts"; console.info(a);`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `const b = "b"; export default b;`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];

        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const b = "b";\nconsole.info(b);\n`,
        );
      },
    });

    await t.step({
      name: "default export → default import alias",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import a from "./b.ts"; console.info(a);`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `const b = "b"; export default b;`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];

        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const b = "b";\nconsole.info(b);\n`,
        );
      },
    });

    await t.step({
      name: "default export → multiple default import alias",
      async fn() {
        const root = "dist";
        const sourceA =
          `import "./b.ts"; import c from "./c.ts"; console.info("a", c);`;
        const inputA = "file:///src/a.ts";
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `import b from "./c.ts"; console.info("b", b);`;
        const astB = parse(sourceB);

        const inputC = "file:///src/c.ts";
        const itemC = {
          input: inputC,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceC = `const c = "c"; export default c;`;
        const astC = parse(sourceC);

        const dependencyItems: Item[] = [itemB, itemC];
        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );
        bundler.sourceMap.set(
          inputC,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astC,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const c = "c";\nconsole.info("b", c);\nconsole.info("a", c);\n`,
        );
      },
    });

    await t.step({
      name: "dynamic import",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import("./b.ts");`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.DynamicImport,
          format: DependencyFormat.Script,
        };
        const sourceB = `console.info("hello world");`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];

        const chunks: Chunk[] = [{
          item: itemB,
          dependencyItems: [],
          output: "file:///dist/b.js",
        }];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.DynamicImport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(stringify(result), `import("/b.js");\n`);
      },
    });
    await t.step({
      name: "dynamic import warn",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import("./" + "b.ts");`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.DynamicImport,
          format: DependencyFormat.Script,
        };
        const sourceB = `console.info("hello world");`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];

        const chunks: Chunk[] = [{
          item: itemB,
          dependencyItems: [],
          output: "file:///dist/b.js",
        }];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.DynamicImport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(stringify(result), `import("./" + "b.ts");\n`);
      },
    });

    await t.step({
      name: "export → nested collision variable usage before declaration",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA =
          `import "./b.ts"; function fn() { return b } const { x: { b } } = y; fn();`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `const b = "b"; console.info(b);`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];

        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const b = "b";\nconsole.info(b);\nfunction fn() { return b1; }\nconst { x: { b: b1 } } = y;\nfn();\n`,
        );
      },
    });

    await t.step({
      name: "export → collision variable usage before declaration",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA =
          `import "./b.ts"; function fn() { return b } const b = "a"; fn();`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `const b = "b"; console.info(b);`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];

        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const b = "b";\nconsole.info(b);\nfunction fn() { return b1; }\nconst b1 = "a";\nfn();\n`,
        );
      },
    });
  },
});

Deno.test({
  name: "update export moduleSpecifier",
  async fn(t) {
    await t.step({
      name: "type",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `export type { A } from "./b.ts";`;
        const astA = parse(sourceA);

        const dependencyItems: Item[] = [];

        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(stringify(result), ``);
      },
    });
    await t.step({
      name: "interface",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `export interface A { };`;
        const astA = parse(sourceA);

        const dependencyItems: Item[] = [];

        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `interface A {\n}\n;\nexport { A };\n`,
        );
      },
    });
    await t.step({
      name: "enum",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `export enum A { };`;
        const astA = parse(sourceA);

        const dependencyItems: Item[] = [];

        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `enum A {\n}\n;\nexport { A };\n`,
        );
      },
    });
    await t.step({
      name: "namespace",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `export * from "./b.ts";`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `export const b = "b";`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [];

        const chunks: Chunk[] = [
          {
            item: itemB,
            dependencyItems: [],
            output: "file:///dist/b.js",
          },
        ];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(stringify(result), `export * from "/b.js";\n`);
      },
    });
    await t.step({
      name: "named alias default",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `export { x as default };`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `const b = "b"; export default b;`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [];

        const chunks: Chunk[] = [
          {
            item: itemB,
            dependencyItems: [],
            output: "file:///dist/b.js",
          },
        ];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(stringify(result), `export { x as default };\n`);
      },
    });
    await t.step({
      name: "namespace alias",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `export * as b from "./b.ts";`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `export const b = "b";`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [];

        const chunks: Chunk[] = [
          {
            item: itemB,
            dependencyItems: [],
            output: "file:///dist/b.js",
          },
        ];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(stringify(result), `export * as b from "/b.js";\n`);
      },
    });
    await t.step({
      name: "forward named",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `export { b } from "./b.ts"`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `export const b = "b";`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [];

        const chunks: Chunk[] = [
          {
            item: itemB,
            dependencyItems: [],
            output: "file:///dist/b.js",
          },
        ];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(stringify(result), `export { b } from "/b.js";\n`);
      },
    });
  },
});

Deno.test({
  name: "inline export source",
  async fn(t) {
    await t.step({
      name: "type export",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `export type { b } from "./b.ts";`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = "export type b = string;";
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];

        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `type b = string;\nexport { b };\n`,
        );
      },
    });
    await t.step({
      name: "export → named export",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `export { b } from "./b.ts";`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `export const b = "b";`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];

        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(stringify(result), `const b = "b";\nexport { b };\n`);
      },
    });
    await t.step({
      name: "export → named alias export",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `export { b as a } from "./b.ts";`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `export const b = "b";`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];

        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const b = "b";\nexport { b as a };\n`,
        );
      },
    });
    await t.step({
      name: "alias export → named export",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `export { b } from "./b.ts";`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `const x = "x"; export { x as b };`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];

        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const x = "x";\nexport { x as b };\n`,
        );
      },
    });
    await t.step({
      name: "export → named alias export",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `export { b as a } from "./b.ts";`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `const b = "b"; export { b };`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];

        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const b = "b";\nexport { b as a };\n`,
        );
      },
    });
    await t.step({
      name: "alias export → named alias export",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `export { b as a } from "./b.ts";`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `const x = "x"; export { x as b };`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];

        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const x = "x";\nexport { x as a };\n`,
        );
      },
    });
    await t.step({
      name: "alias export → namespace export → named alias export",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `export { c as a } from "./b.ts";`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `export * from "./c.ts`;
        const astB = parse(sourceB);

        const inputC = "file:///src/c.ts";
        const itemC = {
          input: inputC,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceC = `const x = "x"; export { x as c };`;
        const astC = parse(sourceC);

        const dependencyItems: Item[] = [itemB, itemC];
        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );
        bundler.sourceMap.set(
          inputC,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astC,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const x = "x";\nexport { x as a };\n`,
        );
      },
    });
    await t.step({
      name: "named alias export alias export",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `export { b as a } from "./b.ts";`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `const x = "x"; export { x as b };`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];

        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const x = "x";\nexport { x as a };\n`,
        );
      },
    });

    await t.step({
      name: "namespace export",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `export * from "./b.ts";`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `export const b = "b";`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];
        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const b = "b";\nexport { b };\n`,
        );
      },
    });
    await t.step({
      name: "chain namespace export",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `export * from "./b.ts";`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `export * from "./c.ts";`;
        const astB = parse(sourceB);

        const inputC = "file:///src/c.ts";
        const itemC = {
          input: inputC,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceC = `export const c = "c";`;
        const astC = parse(sourceC);

        const dependencyItems: Item[] = [itemB, itemC];
        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );
        bundler.sourceMap.set(
          inputC,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astC,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const c = "c";\nexport { c };\n`,
        );
      },
    });
    await t.step({
      name: "chain namespace alias export",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `export * from "./b.ts";`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `export * as b from "./c.ts";`;
        const astB = parse(sourceB);

        const inputC = "file:///src/c.ts";
        const itemC = {
          input: inputC,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceC = `export const c = "c";`;
        const astC = parse(sourceC);

        const dependencyItems: Item[] = [itemB, itemC];
        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );
        bundler.sourceMap.set(
          inputC,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astC,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const c = "c";\nconst mod = { c };\nexport { mod as b };\n`,
        );
      },
    });

    await t.step({
      name: "alias export → namespace export",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `export * from "./b.ts";`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `const x = "x"; export { x as b }`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];
        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const x = "x";\nexport { x as b };\n`,
        );
      },
    });
    await t.step({
      name: "export → namespace export identifier collision",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA =
          `export * from "./b.ts"; const b = "a"; console.info(b);`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `export const b = "b";`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];
        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const b = "b";\nconst b1 = "a";\nconsole.info(b1);\nexport { b };\n`,
        );
      },
    });
    await t.step({
      name: "export → mod identifier export collision",
      async fn() {
        const root = "dist";
        const sourceA =
          `export * as b from "./b.ts"; const mod = "mod"; console.info(mod);`;
        const inputA = "file:///src/a.ts";
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `export const b = "b";`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];
        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const b = "b";\nconst mod = { b };\nconst mod1 = "mod";\nconsole.info(mod1);\nexport { mod as b };\n`,
        );
      },
    });
    await t.step({
      name: "export → namespace alias export",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `export * as a from "./b.ts";`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `export const b = "b";`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];
        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const b = "b";\nconst mod = { b };\nexport { mod as a };\n`,
        );
      },
    });
    await t.step({
      name: "export → named namespace export",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `export * as a from "./b.ts";`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.ts";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        };
        const sourceB = `export const b = "b";`;
        const astB = parse(sourceB);

        const dependencyItems: Item[] = [itemB];
        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          astB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );

        assertEquals(
          stringify(result),
          `const b = "b";\nconst mod = { b };\nexport { mod as a };\n`,
        );
      },
    });
  },
});

Deno.test({
  name: "WebWorker",
  async fn() {
    const root = "dist";

    const inputA = "file:///src/a.ts";
    const sourceA = `const worker = new Worker("./b.ts")`;
    const astA = parse(sourceA);

    const inputB = "file:///src/b.ts";
    const itemB = {
      input: inputB,
      type: DependencyType.WebWorker,
      format: DependencyFormat.Script,
    };
    const sourceB = `console.info("hello world");`;
    const astB = parse(sourceB);

    const dependencyItems: Item[] = [];

    const chunks: Chunk[] = [
      {
        item: itemB,
        dependencyItems: [],
        output: "file:///dist/b.js",
      },
    ];

    const bundler = new Bundler({ plugins: [], quiet: true });
    bundler.sourceMap.set(
      inputB,
      DependencyType.ImportExport,
      DependencyFormat.Script,
      astB,
    );

    const result = await injectDependencies(
      inputA,
      dependencyItems,
      astA,
      chunks,
      bundler,
      { root, compilerOptions },
    );
    assertEquals(stringify(result), `const worker = new Worker("/b.js");\n`);
  },
});
Deno.test({
  name: "fetch",
  async fn() {
    const root = "dist";

    const inputA = "file:///src/a.ts";
    const sourceA = `fetch("./b.ts")`;
    const astA = parse(sourceA);

    const inputB = "file:///src/b.ts";
    const itemB = {
      input: inputB,
      type: DependencyType.Fetch,
      format: DependencyFormat.Script,
    };
    const sourceB = `console.info("hello world");`;
    const astB = parse(sourceB);

    const dependencyItems: Item[] = [];

    const chunks: Chunk[] = [
      {
        item: itemB,
        dependencyItems: [],
        output: "file:///dist/b.js",
      },
    ];

    const bundler = new Bundler({ plugins: [], quiet: true });
    bundler.sourceMap.set(
      inputB,
      DependencyType.ImportExport,
      DependencyFormat.Script,
      astB,
    );

    const result = await injectDependencies(
      inputA,
      dependencyItems,
      astA,
      chunks,
      bundler,
      { root, compilerOptions },
    );
    assertEquals(stringify(result), `fetch("/b.js");\n`);
  },
});
Deno.test({
  name: "ServiceWorker",
  async fn() {
    const root = "dist";

    const inputA = "file:///src/a.ts";
    const sourceA = `navigator.serviceWorker.register("./b.ts")`;
    const astA = parse(sourceA);

    const inputB = "file:///src/b.ts";

    const itemB = {
      input: inputB,
      type: DependencyType.ServiceWorker,
      format: DependencyFormat.Script,
    };
    const sourceB = `console.info("hello world");`;
    const astB = parse(sourceB);

    const dependencyItems: Item[] = [];

    const chunks: Chunk[] = [
      {
        item: itemB,
        dependencyItems: [],
        output: "file:///dist/b.js",
      },
    ];

    const bundler = new Bundler({ plugins: [], quiet: true });
    bundler.sourceMap.set(
      inputB,
      DependencyType.ImportExport,
      DependencyFormat.Script,
      astB,
    );

    const result = await injectDependencies(
      inputA,
      dependencyItems,
      astA,
      chunks,
      bundler,
      { root, compilerOptions },
    );
    assertEquals(
      stringify(result),
      `navigator.serviceWorker.register("/b.js");\n`,
    );
  },
});
Deno.test({
  name: "json assertion import",
  async fn(t) {
    await t.step({
      name: "update moduleSpecifier",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import json from "./b.json" assert { type: "json" }`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.json";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Json,
        };
        const sourceB = `{ "foo": "bar" }`;

        const dependencyItems: Item[] = [];

        const chunks: Chunk[] = [
          {
            item: itemB,
            dependencyItems: [],
            output: "file:///dist/b.json",
          },
        ];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Script,
          sourceB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );
        assertEquals(
          stringify(result),
          `import json from "/b.json" assert { type: "json" };\n`,
        );
      },
    });
    await t.step({
      name: "inline import",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import json from "./b.json" assert { type: "json" }`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.json";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Json,
        };
        const sourceB = { "foo": "bar" };

        const dependencyItems: Item[] = [itemB];
        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Json,
          sourceB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );
        assertEquals(
          stringify(result),
          `const json = JSON.parse(\`{"foo":"bar"}\`);\n`,
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
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import css from "./b.css" assert { type: "css" }`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.css";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Style,
        };
        const sourceB = `h1 { color: red; }`;

        const dependencyItems: Item[] = [];

        const chunks: Chunk[] = [
          {
            item: itemB,
            dependencyItems: [],
            output: "file:///dist/b.css",
          },
        ];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Style,
          sourceB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );
        assertEquals(
          stringify(result),
          `import css from "/b.css" assert { type: "css" };\n`,
        );
      },
    });
    await t.step({
      name: "inline import",
      async fn() {
        const root = "dist";

        const inputA = "file:///src/a.ts";
        const sourceA = `import css from "./b.css" assert { type: "css" }`;
        const astA = parse(sourceA);

        const inputB = "file:///src/b.css";
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Style,
        };
        const sourceB = `h1 { color: red; }`;

        const dependencyItems: Item[] = [itemB];
        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [], quiet: true });
        bundler.sourceMap.set(
          inputB,
          DependencyType.ImportExport,
          DependencyFormat.Style,
          sourceB,
        );

        const result = await injectDependencies(
          inputA,
          dependencyItems,
          astA,
          chunks,
          bundler,
          { root, compilerOptions },
        );
        assertEquals(
          stringify(result),
          `const css = new CSSStyleSheet();\ncss.replaceSync(\`h1 { color: red; }\`);\n`,
        );
      },
    });
  },
});
