import { Bundler } from "../../bundler.ts";
import { ImportMap, resolveImportMap } from "../../deps.ts";
import { assertEquals } from "../../test_deps.ts";
import { Chunk, DependencyFormat, DependencyType, Item } from "../_util.ts";
import { injectDependencies } from "./inject_dependencies.ts";
import { parse, stringify } from "./_util.ts";

Deno.test({
  name: "inject",
  async fn() {
    const input = "file:///src/styles.css";
    const source = `@import "custom/path/dependency.css";`;
    const ast = parse(source);
    const root = "dist";
    const chunks: Chunk[] = [
      {
        item: {
          input: "file:///src/custom/path/dependency.css",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Style,
        },
        dependencyItems: [],
        output: "file:///dist/output.css",
      },
    ];
    const dependencyItems: Item[] = [];
    const bundler = new Bundler({ plugins: [], quiet: true });
    const result = await injectDependencies(
      input,
      ast,
      dependencyItems,
      chunks,
      bundler,
      {
        root,
      },
    );

    assertEquals(stringify(result), `@import "/output.css";`);
  },
});

Deno.test({
  name: "importMap",
  async fn() {
    const importMap = { imports: { "./path/": "./custom/path/" } };
    const resolvedImportMap = resolveImportMap(
      importMap,
      new URL("file:///"),
    ) as ImportMap;
    const input = "file:///styles.css";
    const source = `@import "path/dependency.css";`;
    const ast = parse(source);
    const root = "dist";
    const chunks: Chunk[] = [
      {
        item: {
          input: "file:///custom/path/dependency.css",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Style,
        },
        dependencyItems: [],
        output: "file:///dist/output.css",
      },
    ];

    const dependencyItems: Item[] = [];

    const bundler = new Bundler({ plugins: [], quiet: true });

    const result = await injectDependencies(
      input,
      ast,
      dependencyItems,
      chunks,
      bundler,
      {
        root,
        importMap: resolvedImportMap,
      },
    );

    assertEquals(stringify(result), `@import "/output.css";`);
  },
});

Deno.test({
  name: "@import",
  async fn(t) {
    await t.step({
      name: "literal",
      async fn() {
        const input = "file:///styles.css";
        const source = `@import url("/other/style.css");`;
        const ast = parse(source);
        const root = "dist";

        const dependencyItems: Item[] = [];
        const chunks: Chunk[] = [
          {
            item: {
              input: "file:///other/style.css",
              type: DependencyType.ImportExport,
              format: DependencyFormat.Style,
            },
            dependencyItems: [],
            output: "file:///dist/output.css",
          },
        ];
        const bundler = new Bundler({ plugins: [], quiet: true });

        const transformedSource = await injectDependencies(
          input,
          ast,
          dependencyItems,
          chunks,
          bundler,
          { root },
        );
        assertEquals(
          stringify(transformedSource),
          `@import url("/output.css");`,
        );
      },
    });
    await t.step({
      name: "url",
      async fn() {
        const input = "file:///styles.css";
        const source = `@import url("/other/style.css");`;
        const ast = parse(source);
        const root = "dist";
        const chunks: Chunk[] = [
          {
            item: {
              input: "file:///other/style.css",
              type: DependencyType.ImportExport,
              format: DependencyFormat.Style,
            },
            dependencyItems: [],
            output: "file:///dist/custom/other/style.css",
          },
        ];

        const dependencyItems: Item[] = [];
        const bundler = new Bundler({ plugins: [], quiet: true });

        const transformedSource = await injectDependencies(
          input,
          ast,
          dependencyItems,
          chunks,
          bundler,
          { root },
        );
        assertEquals(
          stringify(transformedSource),
          `@import url("/custom/other/style.css");`,
        );
      },
    });
  },
});

Deno.test({
  name: "property",
  async fn(t) {
    await t.step({
      name: "url",
      async fn() {
        const input = "file:///styles.css";
        const source = `div { background-image: url("image.png"); }`;
        const ast = parse(source);
        const root = "dist";
        const chunks: Chunk[] = [
          {
            item: {
              input: "file:///image.png",
              type: DependencyType.ImportExport,
              format: DependencyFormat.Binary,
            },
            dependencyItems: [],
            output: "file:///dist/image.png",
          },
        ];
        const dependencyItems: Item[] = [];
        const bundler = new Bundler({ plugins: [], quiet: true });

        const transformedSource = await injectDependencies(
          input,
          ast,
          dependencyItems,
          chunks,
          bundler,
          { root },
        );
        assertEquals(
          stringify(transformedSource),
          `div { background-image: url("/image.png"); }`,
        );
      },
    });
  },
});

Deno.test({
  name: "inline import",
  async fn() {
    const inputB = "file:///b.css";
    const sourceB = `div { color: red; }`;
    const astB = parse(sourceB);
    const itemB = {
      input: inputB,
      type: DependencyType.ImportExport,
      format: DependencyFormat.Style,
    };

    const inputA = "file:///a.css";
    const sourceA = `@import "b.css";`;
    const astA = parse(sourceA);
    const dependencyItems = [itemB];

    const chunks: Chunk[] = [];

    const bundler = new Bundler({ plugins: [], quiet: true });
    bundler.cacheMap.set(
      inputB,
      DependencyType.ImportExport,
      DependencyFormat.Style,
      astB,
    );

    const result = await injectDependencies(
      inputA,
      astA,
      dependencyItems,
      chunks,
      bundler,
    );

    assertEquals(stringify(result), `div { color: red; }`);
  },
});

Deno.test({
  name: "always inline import",
  async fn() {
    const inputA = "file:///a.css";
    const sourceA = `@import "b.css";`;
    const astA = parse(sourceA);
    const inputB = "file:///b.css";
    const itemB = {
      input: inputB,
      type: DependencyType.ImportExport,
      format: DependencyFormat.Style,
    };
    const sourceB = `div { color: red; }`;
    const astB = parse(sourceB);

    const dependencyItems = [itemB];

    const bundler = new Bundler({ plugins: [], quiet: true });
    bundler.cacheMap.set(
      inputB,
      DependencyType.ImportExport,
      DependencyFormat.Style,
      astB,
    );

    const chunkB: Chunk = {
      item: itemB,
      dependencyItems: [],
      output: "/dist/b.css",
    };
    const chunks = [chunkB];
    const result = await injectDependencies(
      inputA,
      astA,
      dependencyItems,
      chunks,
      bundler,
    );

    assertEquals(stringify(result), `div { color: red; }`);
  },
});
