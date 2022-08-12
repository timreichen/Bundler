import { ImportMap, resolveImportMap } from "../../deps.ts";
import { assertEquals } from "../../test_deps.ts";
import { DependencyFormat, DependencyType } from "../_util.ts";
import { extractDependencies } from "./extract_dependencies.ts";
import { parse } from "./_util.ts";

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
    const moduleData = await extractDependencies(
      input,
      ast,
      { importMap: resolvedImportMap },
    );

    assertEquals(moduleData, [{
      input: "file:///custom/path/dependency.css",
      format: DependencyFormat.Style,
      type: DependencyType.ImportExport,
    }]);
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
            const ast = parse(source);
            const moduleData = await extractDependencies(
              input,
              ast,
              { importMap },
            );

            assertEquals(moduleData, [{
              input: "file:///src/dependency.css",
              format: DependencyFormat.Style,
              type: DependencyType.ImportExport,
            }]);
          },
        },
      );
      await t.step({
        name: "url",
        async fn() {
          const importMap = { imports: {} };
          const input = "/src/styles.css";
          const source = `@import url("dependency.css");`;
          const ast = parse(source);
          const moduleData = await extractDependencies(
            input,
            ast,
            { importMap },
          );

          assertEquals(moduleData, [{
            input: "file:///src/dependency.css",
            format: DependencyFormat.Style,
            type: DependencyType.ImportExport,
          }]);
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
        const ast = parse(source);
        const moduleData = await extractDependencies(input, ast, { importMap });

        assertEquals(moduleData, [{
          input: "file:///src/image.png",
          format: DependencyFormat.Binary,
          type: DependencyType.ImportExport,
        }]);
      },
    });
  },
});
