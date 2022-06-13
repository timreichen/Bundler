import { assertEquals } from "../../../test_deps.ts";
import { ImportMap, resolveImportMap } from "../../../deps.ts";
import { Chunk, DependencyFormat, DependencyType } from "../../plugin.ts";
import { injectDependencies } from "./inject_dependencies.ts";

Deno.test({
  name: "inject",
  async fn() {
    const input = "file:///src/styles.css";
    const source = `@import "custom/path/dependency.css";`;
    const root = "dist";
    const chunks: Chunk[] = [
      {
        item: {
          input: "file:///src/custom/path/dependency.css",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Style,
          source,
        },
        dependencyItems: [],
        output: "file:///dist/output.css",
      },
    ];
    const result = await injectDependencies(
      input,
      source,
      { root, chunks },
    );

    assertEquals(result, `@import "/output.css";`);
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
    const root = "dist";
    const chunks: Chunk[] = [
      {
        item: {
          input: "file:///custom/path/dependency.css",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Style,
          source,
        },
        dependencyItems: [],
        output: "file:///dist/output.css",
      },
    ];
    const result = await injectDependencies(
      input,
      source,
      {
        root,
        chunks,
        importMap: resolvedImportMap,
      },
    );

    assertEquals(result, `@import "/output.css";`);
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
        const root = "dist";
        const chunks: Chunk[] = [
          {
            item: {
              input: "file:///other/style.css",
              type: DependencyType.ImportExport,
              format: DependencyFormat.Style,
              source,
            },
            dependencyItems: [],
            output: "file:///dist/output.css",
          },
        ];
        const transformedSource = await injectDependencies(
          input,
          source,
          { root, chunks },
        );
        assertEquals(
          transformedSource,
          `@import url("/output.css");`,
        );
      },
    });
    await t.step({
      name: "url",
      async fn() {
        const input = "file:///styles.css";
        const source = `@import url("/other/style.css");`;
        const root = "dist";
        const chunks: Chunk[] = [
          {
            item: {
              input: "file:///other/style.css",
              type: DependencyType.ImportExport,
              format: DependencyFormat.Style,
              source,
            },
            dependencyItems: [],
            output: "file:///dist/custom/other/style.css",
          },
        ];
        const transformedSource = await injectDependencies(
          input,
          source,
          { root, chunks },
        );
        assertEquals(
          transformedSource,
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
        const root = "dist";
        const chunks: Chunk[] = [
          {
            item: {
              input: "file:///image.png",
              type: DependencyType.ImportExport,
              format: DependencyFormat.Binary,
              source,
            },
            dependencyItems: [],
            output: "file:///dist/image.png",
          },
        ];
        const transformedSource = await injectDependencies(
          input,
          source,
          { root, chunks },
        );
        assertEquals(
          transformedSource,
          `div { background-image: url("/image.png"); }`,
        );
      },
    });
  },
});
