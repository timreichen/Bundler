import { postcss } from "../../../deps.ts";
import { assertEquals } from "../../../test_deps.ts";
import { Dependencies, DependencyType, Format } from "../../plugin.ts";
import { postcssExtractDependenciesPlugin } from "./extract_dependencies.ts";

Deno.test({
  name: "[postcss extract dependencies plugin] importMap",
  async fn() {
    const importMap = {
      imports: {
        "path/": "custom/path/",
      },
    };
    const input = "styles.css";
    const dependencies: Dependencies = { imports: {}, exports: {} };
    const plugin = postcssExtractDependenciesPlugin(dependencies)(
      input,
      { importMap },
    );
    const processor = postcss.default([plugin]);

    const source = `@import "path/dependency.css";`;
    await processor.process(source);

    assertEquals(dependencies, {
      imports: {
        "custom/path/dependency.css": {
          specifiers: {},
          defaults: [],
          namespaces: [],
          type: DependencyType.Import,
          format: Format.Style,
        },
      },
      exports: {},
    });
  },
});

Deno.test({
  name: "[postcss extract dependencies plugin] @import",
  async fn() {
    const importMap = { imports: {} };
    const input = "styles.css";
    const dependencies: Dependencies = { imports: {}, exports: {} };
    const plugin = postcssExtractDependenciesPlugin(dependencies)(
      input,
      { importMap },
    );
    const processor = postcss.default([plugin]);

    const source = `@import "dependency.css";`;
    await processor.process(source);

    assertEquals(dependencies, {
      imports: {
        "dependency.css": {
          specifiers: {},
          defaults: [],
          namespaces: [],
          type: DependencyType.Import,
          format: Format.Style,
        },
      },
      exports: {},
    });
  },
});

Deno.test({
  name: "[postcss extract dependencies plugin] @import url()",
  async fn() {
    const importMap = { imports: {} };
    const input = "styles.css";
    const dependencies: Dependencies = { imports: {}, exports: {} };
    const plugin = postcssExtractDependenciesPlugin(dependencies)(
      input,
      { importMap },
    );
    const processor = postcss.default([plugin]);

    const source = `@import url("dependency.css");`;
    await processor.process(source);

    assertEquals(dependencies, {
      imports: {
        "dependency.css": {
          specifiers: {},
          defaults: [],
          namespaces: [],
          type: DependencyType.Import,
          format: Format.Style,
        },
      },
      exports: {},
    });
  },
});

Deno.test({
  name: "[postcss extract dependencies plugin] url()",
  async fn() {
    const importMap = { imports: {} };
    const input = "styles.css";
    const dependencies: Dependencies = { imports: {}, exports: {} };
    const plugin = postcssExtractDependenciesPlugin(dependencies)(
      input,
      { importMap },
    );
    const processor = postcss.default([plugin]);

    const source = `div {
      background-image: url("image.png");
    }`;
    await processor.process(source);

    assertEquals(dependencies, {
      imports: {
        "image.png": {
          specifiers: {},
          defaults: [],
          namespaces: [],
          type: DependencyType.Import,
          format: Format.Image,
        },
      },
      exports: {},
    });
  },
});
