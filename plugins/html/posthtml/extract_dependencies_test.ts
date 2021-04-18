import { postcss, posthtml } from "../../../deps.ts";
import { assertEquals, tests } from "../../../test_deps.ts";
import { Dependencies, DependencyType, Format } from "../../plugin.ts";
import {
  posthtmlExtractImageDependencies,
  posthtmlExtractInlineStyleDependencies,
  posthtmlExtractLinkDependencies,
  posthtmlExtractScriptDependencies,
  posthtmlExtractStyleDependencies,
} from "./extract_dependencies.ts";

tests({
  name: "posthtml extract dependencies plugin",
  tests: () => [
    {
      name: "importMap",
      async fn() {
        const importMap = {
          imports: {
            "path/": "custom/path/",
          },
        };
        const input = "a.html";
        const dependencies: Dependencies = { imports: {}, exports: {} };
        const plugin = posthtmlExtractImageDependencies(dependencies)(
          input,
          { importMap },
        );
        const processor = posthtml([plugin]);

        const source = `<html><body><img src="path/b.png"></body></html>`;
        await processor.process(source);

        assertEquals(dependencies, {
          imports: {
            "custom/path/b.png": {
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
    },

    {
      name: "base",
      async fn() {
        const importMap = {
          imports: {
            "path/": "custom/path/",
          },
        };
        const input = "a.html";
        const dependencies: Dependencies = { imports: {}, exports: {} };
        const plugin = posthtmlExtractImageDependencies(dependencies)(
          input,
          { importMap },
        );
        const processor = posthtml([plugin]);

        const source = `<html>
        <head><base href="custom/path/"></head>
        <body><img src="b.png"></body></html>`;
        await processor.process(source);

        assertEquals(dependencies, {
          imports: {
            "custom/path/b.png": {
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
    },

    {
      name: "base and importMap",
      async fn() {
        const importMap = {
          imports: {
            "path/": "custom/path/",
          },
        };
        const input = "a.html";
        const dependencies: Dependencies = { imports: {}, exports: {} };
        const plugin = posthtmlExtractImageDependencies(dependencies)(
          input,
          { importMap },
        );
        const processor = posthtml([plugin]);

        const source = `<html>
        <head><base href="custom/"></head>
        <body><img src="path/b.png"></body></html>`;
        await processor.process(source);

        assertEquals(dependencies, {
          imports: {
            "custom/path/b.png": {
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
    },

    {
      name: "link",
      async fn() {
        const importMap = { imports: {} };
        const input = "a.html";
        const dependencies: Dependencies = { imports: {}, exports: {} };
        const plugin = posthtmlExtractLinkDependencies(dependencies)(
          input,
          { importMap },
        );
        const processor = posthtml([plugin]);

        const source =
          `<html><head><link rel="stylesheet" href="b.css"></head></html>`;
        await processor.process(source);

        assertEquals(dependencies, {
          imports: {
            "b.css": {
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
    },

    {
      name: "webmanifest",
      async fn() {
        const importMap = { imports: {} };
        const input = "a.html";
        const dependencies: Dependencies = { imports: {}, exports: {} };
        const plugin = posthtmlExtractLinkDependencies(dependencies)(
          input,
          { importMap },
        );
        const processor = posthtml([plugin]);

        const source =
          `<html><head><link rel="manifest" href="webmanifest.json"></div></head></html>`;
        await processor.process(source);

        assertEquals(dependencies, {
          imports: {
            "webmanifest.json": {
              specifiers: {},
              defaults: [],
              namespaces: [],
              type: DependencyType.Import,
              format: Format.WebManifest,
            },
          },
          exports: {},
        });
      },
    },

    {
      name: "script",
      async fn() {
        const importMap = { imports: {} };
        const input = "a.html";
        const dependencies: Dependencies = { imports: {}, exports: {} };
        const plugin = posthtmlExtractScriptDependencies(dependencies)(
          input,
          { importMap },
        );
        const processor = posthtml([plugin]);

        const source = `<html><body><script src="b.js"></script></body></html>`;
        await processor.process(source);

        assertEquals(dependencies, {
          imports: {
            "b.js": {
              specifiers: {},
              defaults: [],
              namespaces: [],
              type: DependencyType.Import,
              format: Format.Script,
            },
          },
          exports: {},
        });
      },
    },

    {
      name: "style",
      async fn() {
        const use: postcss.AcceptedPlugin[] = [];
        const importMap = { imports: {} };
        const input = "a.html";
        const dependencies: Dependencies = { imports: {}, exports: {} };
        const plugin = posthtmlExtractStyleDependencies(dependencies)(
          input,
          { importMap, use },
        );
        const processor = posthtml([plugin]);

        const source =
          `<html><head><style>@import "b.css";</style></head></html>`;
        await processor.process(source);

        assertEquals(dependencies, {
          imports: {
            "b.css": {
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
    },

    {
      name: "inline style",
      async fn() {
        const use: postcss.AcceptedPlugin[] = [];
        const importMap = { imports: {} };
        const input = "a.html";
        const dependencies: Dependencies = { imports: {}, exports: {} };
        const plugin = posthtmlExtractInlineStyleDependencies(dependencies)(
          input,
          { importMap, use },
        );
        const processor = posthtml([plugin]);

        const source =
          `<html><body><div style="background: url('b.png')"></div></body></html>`;
        await processor.process(source);

        assertEquals(dependencies, {
          imports: {
            "b.png": {
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
    },
  ],
});
