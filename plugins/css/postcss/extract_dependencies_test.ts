import { assertEquals, tests } from "../../../test_deps.ts";
import { DependencyType } from "../../plugin.ts";
import { extractDependencies } from "./extract_dependencies.ts";

tests({
  name: "postcss plugin → extract dependencies",
  tests: () => [
    {
      name: "importMap",
      async fn() {
        const importMap = { imports: { "path/": "custom/path/" } };
        const input = "styles.css";
        const source = `@import "path/dependency.css";`;
        const moduleData = await extractDependencies(input, source, importMap);

        assertEquals(moduleData, {
          dependencies: {
            "custom/path/dependency.css": {
              [DependencyType.Import]: {},
            },
          },
          export: {},
        });
      },
    },

    {
      name: "@import",
      async fn() {
        const importMap = { imports: {} };
        const input = "styles.css";
        const source = `@import "dependency.css";`;
        const moduleData = await extractDependencies(input, source, importMap);

        assertEquals(moduleData, {
          dependencies: {
            "dependency.css": {
              [DependencyType.Import]: {},
            },
          },
          export: {},
        });
      },
    },

    {
      name: "@import url()",
      async fn() {
        const importMap = { imports: {} };
        const input = "styles.css";
        const source = `@import url("dependency.css");`;
        const moduleData = await extractDependencies(input, source, importMap);

        assertEquals(moduleData, {
          dependencies: {
            "dependency.css": {
              [DependencyType.Import]: {},
            },
          },
          export: {},
        });
      },
    },

    {
      name: "url()",
      async fn() {
        const importMap = { imports: {} };
        const input = "styles.css";
        const source = `div { background-image: url("image.png"); }`;
        const moduleData = await extractDependencies(input, source, importMap);

        assertEquals(moduleData, {
          dependencies: {
            "image.png": {
              [DependencyType.Import]: [],
            },
          },
          export: {},
        });
      },
    },
  ],
});
