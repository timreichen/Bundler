import { postcss, posthtml } from "../../../deps.ts";
import { assertEquals, tests } from "../../../test_deps.ts";
import { DependencyType, ModuleData } from "../../plugin.ts";
import {
  posthtmlExtractImageDependencies,
  posthtmlExtractInlineStyleDependencies,
  posthtmlExtractLinkDependencies,
  posthtmlExtractScriptDependencies,
  posthtmlExtractStyleDependencies,
} from "./extract_dependencies.ts";

tests({
  name: "posthtml plugin → extract dependencies",
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
        const moduleData: ModuleData = { dependencies: {}, export: {} };
        const plugin = posthtmlExtractImageDependencies(moduleData)(
          input,
          { importMap },
        );
        const processor = posthtml([plugin]);

        const source = `<html><body><img src="path/b.png"></body></html>`;
        await processor.process(source);

        assertEquals(moduleData, {
          dependencies: {
            "custom/path/b.png": {
              [DependencyType.Import]: {},
            },
          },
          export: {},
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
        const moduleData: ModuleData = { dependencies: {}, export: {} };
        const plugin = posthtmlExtractImageDependencies(moduleData)(
          input,
          { importMap },
        );
        const processor = posthtml([plugin]);

        const source = `<html>
        <head><base href="custom/path/"></head>
        <body><img src="b.png"></body></html>`;
        await processor.process(source);

        assertEquals(moduleData, {
          dependencies: {
            "custom/path/b.png": {
              [DependencyType.Import]: {},
            },
          },
          export: {},
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
        const moduleData: ModuleData = { dependencies: {}, export: {} };
        const plugin = posthtmlExtractImageDependencies(moduleData)(
          input,
          { importMap },
        );
        const processor = posthtml([plugin]);

        const source = `<html>
        <head><base href="custom/"></head>
        <body><img src="path/b.png"></body></html>`;
        await processor.process(source);

        assertEquals(moduleData, {
          dependencies: {
            "custom/path/b.png": {
              [DependencyType.Import]: {},
            },
          },
          export: {},
        });
      },
    },

    {
      name: "link",
      async fn() {
        const importMap = { imports: {} };
        const input = "a.html";
        const moduleData: ModuleData = { dependencies: {}, export: {} };
        const plugin = posthtmlExtractLinkDependencies(moduleData)(
          input,
          { importMap },
        );
        const processor = posthtml([plugin]);

        const source =
          `<html><head><link rel="stylesheet" href="b.css"></head></html>`;
        await processor.process(source);

        assertEquals(moduleData, {
          dependencies: {
            "b.css": {
              [DependencyType.Import]: {},
            },
          },
          export: {},
        });
      },
    },

    {
      name: "webmanifest",
      async fn() {
        const importMap = { imports: {} };
        const input = "a.html";
        const moduleData: ModuleData = { dependencies: {}, export: {} };
        const plugin = posthtmlExtractLinkDependencies(moduleData)(
          input,
          { importMap },
        );
        const processor = posthtml([plugin]);

        const source =
          `<html><head><link rel="manifest" href="webmanifest.json"></div></head></html>`;
        await processor.process(source);

        assertEquals(moduleData, {
          dependencies: {
            "webmanifest.json": {
              [DependencyType.WebManifest]: {},
            },
          },
          export: {},
        });
      },
    },

    {
      name: "script",
      async fn() {
        const importMap = { imports: {} };
        const input = "a.html";
        const moduleData: ModuleData = { dependencies: {}, export: {} };
        const plugin = posthtmlExtractScriptDependencies(moduleData)(
          input,
          { importMap },
        );
        const processor = posthtml([plugin]);

        const source = `<html><body><script src="b.js"></script></body></html>`;
        await processor.process(source);

        assertEquals(moduleData, {
          dependencies: {
            "b.js": {
              [DependencyType.Import]: {},
            },
          },
          export: {},
        });
      },
    },

    {
      name: "style",
      async fn() {
        const use: postcss.AcceptedPlugin[] = [];
        const importMap = { imports: {} };
        const input = "a.html";
        const moduleData: ModuleData = { dependencies: {}, export: {} };
        const plugin = posthtmlExtractStyleDependencies(moduleData)(
          input,
          { importMap, use },
        );
        const processor = posthtml([plugin]);

        const source =
          `<html><head><style>@import "b.css";</style></head></html>`;
        await processor.process(source);

        assertEquals(moduleData, {
          dependencies: {
            "b.css": {
              [DependencyType.Import]: {},
            },
          },
          export: {},
        });
      },
    },

    {
      name: "inline style",
      async fn() {
        const use: postcss.AcceptedPlugin[] = [];
        const importMap = { imports: {} };
        const input = "a.html";
        const moduleData: ModuleData = { dependencies: {}, export: {} };
        const plugin = posthtmlExtractInlineStyleDependencies(moduleData)(
          input,
          { importMap, use },
        );
        const processor = posthtml([plugin]);

        const source =
          `<html><body><div style="background: url('b.png')"></div></body></html>`;
        await processor.process(source);

        assertEquals(moduleData, {
          dependencies: {
            "b.png": {
              [DependencyType.Import]: {},
            },
          },
          export: {},
        });
      },
    },
  ],
});
