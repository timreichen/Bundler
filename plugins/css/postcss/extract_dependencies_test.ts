import { assertEquals } from "../../../test_deps.ts";
import { ImportMap, resolveImportMap } from "../../../deps.ts";
import { DependencyFormat, DependencyType } from "../../plugin.ts";
import { extractDependencies } from "./extract_dependencies.ts";

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
    const moduleData = await extractDependencies(
      input,
      source,
      resolvedImportMap,
    );

    assertEquals(moduleData, {
      dependencies: [{
        input: "file:///custom/path/dependency.css",
        format: DependencyFormat.Style,
        type: DependencyType.ImportExport,
      }],
      exports: {},
    });
  },
});

Deno.test(
  {
    name: "@import",
    async fn(t) {
      await t.step(
        {
          name: "literal",
          async fn() {
            const importMap = { imports: {} };
            const input = "/src/styles.css";
            const source = `@import "dependency.css";`;
            const moduleData = await extractDependencies(
              input,
              source,
              importMap,
            );

            assertEquals(moduleData, {
              dependencies: [{
                input: "file:///src/dependency.css",
                format: DependencyFormat.Style,
                type: DependencyType.ImportExport,
              }],
              exports: {},
            });
          },
        },
      );
      await t.step({
        name: "url",
        async fn() {
          const importMap = { imports: {} };
          const input = "/src/styles.css";
          const source = `@import url("dependency.css");`;
          const moduleData = await extractDependencies(
            input,
            source,
            importMap,
          );

          assertEquals(moduleData, {
            dependencies: [{
              input: "file:///src/dependency.css",
              format: DependencyFormat.Style,
              type: DependencyType.ImportExport,
            }],
            exports: {},
          });
        },
      });
    },
  },
);

Deno.test({
  name: "property",
  async fn(t) {
    await t.step({
      name: "url",
      async fn() {
        const importMap = { imports: {} };
        const input = "/src/styles.css";
        const source = `div { background-image: url("image.png"); }`;
        const moduleData = await extractDependencies(input, source, importMap);

        assertEquals(moduleData, {
          dependencies: [{
            input: "file:///src/image.png",
            format: DependencyFormat.Binary,
            type: DependencyType.ImportExport,
          }],
          exports: {},
        });
      },
    });
  },
});
