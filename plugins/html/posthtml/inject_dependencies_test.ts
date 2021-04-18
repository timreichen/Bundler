import { Bundler } from "../../../bundler.ts";
import { postcss, posthtml } from "../../../deps.ts";
import { Graph } from "../../../graph.ts";
import { assertStringIncludes, tests } from "../../../test_deps.ts";
import { Chunk, Context, DependencyType, Format } from "../../plugin.ts";
import {
  posthtmlInjectImageDependencies,
  posthtmlInjectInlineStyleDependencies,
  posthtmlInjectLinkDependencies,
  posthtmlInjectScriptDependencies,
  posthtmlInjectStyleDependencies,
} from "./inject_dependencies.ts";
tests({
  name: "posthtml inject dependencies plugin",
  tests: () => [
    {
      name: "importMap",
      async fn() {
        const importMap = {
          imports: {
            "path/": "custom/path/",
          },
        };
        const input = "src/a.html";
        const inputOutput = "dist/a.html";
        const dependency = "custom/path/b.png";
        const dependencyOutput = "b.png";
        const graph: Graph = {
          [input]: {
            [DependencyType.Import]: {
              filePath: input,
              output: inputOutput,
              dependencies: {
                imports: {
                  [dependency]: {
                    specifiers: {},
                    defaults: [],
                    namespaces: [],
                    type: DependencyType.Import,
                    format: Format.Image,
                  },
                },
                exports: {},
              },
              format: Format.Style,
            },
          },
          [dependency]: {
            [DependencyType.Import]: {
              filePath: dependency,
              output: dependencyOutput,
              dependencies: { imports: {}, exports: {} },
              format: Format.Image,
            },
          },
        };
        const plugin = posthtmlInjectImageDependencies(
          input,
          dependencyOutput,
          { importMap, graph },
        );
        const processor = posthtml([plugin]);

        const source = `<html><body><img src="path/b.png"></body></html>`;
        const { html } = await processor.process(source);

        assertStringIncludes(
          html,
          `<html><body><img src="./b.png"></body></html>`,
        );
      },
    },

    {
      name: "base",
      async fn() {
        const importMap = { imports: {} };
        const input = "a.html";
        const inputOutput = "dist/a.html";
        const dependency = "custom/path/b.png";
        const dependencyOutput = "dist/b.png";
        const graph: Graph = {
          [input]: {
            [DependencyType.Import]: {
              filePath: input,
              output: inputOutput,
              dependencies: {
                imports: {
                  [dependency]: {
                    specifiers: {},
                    defaults: [],
                    namespaces: [],
                    type: DependencyType.Import,
                    format: Format.Image,
                  },
                },
                exports: {},
              },
              format: Format.Style,
            },
          },
          [dependency]: {
            [DependencyType.Import]: {
              filePath: dependency,
              output: dependencyOutput,
              dependencies: { imports: {}, exports: {} },
              format: Format.Image,
            },
          },
        };
        const plugin = posthtmlInjectImageDependencies(
          input,
          inputOutput,
          { importMap, graph },
        );
        const processor = posthtml([plugin]);

        const source =
          `<html><head><base href="custom/path/"></head><body><img src="b.png"></body></html>`;
        const { html } = await processor.process(source);

        assertStringIncludes(
          html,
          `<html><head><base href="custom/path/"></head><body><img src="./b.png"></body></html>`,
        );
      },
    },

    {
      name: "base and importMap",
      async fn() {
        const importMap = { imports: {} };
        const input = "a.html";
        const inputOutput = "dist/a.html";
        const dependency = "custom/path/b.png";
        const dependencyOutput = "dist/b.png";
        const graph: Graph = {
          [input]: {
            [DependencyType.Import]: {
              filePath: input,
              output: inputOutput,
              dependencies: {
                imports: {
                  [dependency]: {
                    specifiers: {},
                    defaults: [],
                    namespaces: [],
                    type: DependencyType.Import,
                    format: Format.Image,
                  },
                },
                exports: {},
              },
              format: Format.Style,
            },
          },
          [dependency]: {
            [DependencyType.Import]: {
              filePath: dependency,
              output: dependencyOutput,
              dependencies: { imports: {}, exports: {} },
              format: Format.Image,
            },
          },
        };
        const plugin = posthtmlInjectImageDependencies(
          input,
          inputOutput,
          { importMap, graph },
        );
        const processor = posthtml([plugin]);

        const source =
          `<html><head><base href="custom/"></head><body><img src="path/b.png"></body></html>`;
        const { html } = await processor.process(source);

        assertStringIncludes(
          html,
          `<html><head><base href="custom/"></head><body><img src="./b.png"></body></html>`,
        );
      },
    },

    {
      name: "link",
      async fn() {
        const importMap = { imports: {} };
        const input = "src/a.html";
        const inputOutput = "dist/a.html";
        const dependency = "src/b.css";
        const dependencyOutput = "dist/b.css";
        const graph: Graph = {
          [input]: {
            [DependencyType.Import]: {
              filePath: input,
              output: inputOutput,
              dependencies: {
                imports: {
                  [dependency]: {
                    specifiers: {},
                    defaults: [],
                    namespaces: [],
                    type: DependencyType.Import,
                    format: Format.Style,
                  },
                },
                exports: {},
              },
              format: Format.Style,
            },
          },
          [dependency]: {
            [DependencyType.Import]: {
              filePath: dependency,
              output: dependencyOutput,
              dependencies: { imports: {}, exports: {} },
              format: Format.Style,
            },
          },
        };
        const plugin = posthtmlInjectLinkDependencies(
          input,
          inputOutput,
          { importMap, graph },
        );
        const processor = posthtml([plugin]);

        const source =
          `<html><head><link rel="stylesheet" href="b.css"></head></html>`;
        const { html } = await processor.process(source);

        assertStringIncludes(
          html,
          `<html><head><link rel="stylesheet" href="./b.css"></head></html>`,
        );
      },
    },

    {
      name: "link level down",
      async fn() {
        const importMap = { imports: {} };
        const input = "src/a.html";
        const inputOutput = "a.html";
        const dependency = "src/b.css";
        const dependencyOutput = "dist/b.css";
        const graph: Graph = {
          [input]: {
            [DependencyType.Import]: {
              filePath: input,
              output: inputOutput,
              dependencies: {
                imports: {
                  [dependency]: {
                    specifiers: {},
                    defaults: [],
                    namespaces: [],
                    type: DependencyType.Import,
                    format: Format.Style,
                  },
                },
                exports: {},
              },
              format: Format.Style,
            },
          },
          [dependency]: {
            [DependencyType.Import]: {
              filePath: dependency,
              output: dependencyOutput,
              dependencies: { imports: {}, exports: {} },
              format: Format.Style,
            },
          },
        };
        const plugin = posthtmlInjectLinkDependencies(
          input,
          inputOutput,
          { importMap, graph },
        );
        const processor = posthtml([plugin]);

        const source =
          `<html><head><link rel="stylesheet" href="b.css"></head></html>`;
        const { html } = await processor.process(source);

        assertStringIncludes(
          html,
          `<html><head><link rel="stylesheet" href="./dist/b.css"></head></html>`,
        );
      },
    },

    {
      name: "link level up",
      async fn() {
        const importMap = { imports: {} };
        const input = "src/a.html";
        const inputOutput = "dist/a.html";
        const dependency = "src/b.css";
        const dependencyOutput = "b.css";
        const graph: Graph = {
          [input]: {
            [DependencyType.Import]: {
              filePath: input,
              output: inputOutput,
              dependencies: {
                imports: {
                  [dependency]: {
                    specifiers: {},
                    defaults: [],
                    namespaces: [],
                    type: DependencyType.Import,
                    format: Format.Style,
                  },
                },
                exports: {},
              },
              format: Format.Style,
            },
          },
          [dependency]: {
            [DependencyType.Import]: {
              filePath: dependency,
              output: dependencyOutput,
              dependencies: { imports: {}, exports: {} },
              format: Format.Style,
            },
          },
        };
        const plugin = posthtmlInjectLinkDependencies(
          input,
          inputOutput,
          { importMap, graph },
        );
        const processor = posthtml([plugin]);

        const source =
          `<html><head><link rel="stylesheet" href="b.css"></head></html>`;
        const { html } = await processor.process(source);

        assertStringIncludes(
          html,
          `<html><head><link rel="stylesheet" href="../b.css"></head></html>`,
        );
      },
    },

    {
      name: "webmanifest",
      async fn() {
        const importMap = { imports: {} };
        const input = "src/a.html";
        const inputOutput = "dist/a.html";
        const dependency = "src/webmanifest.json";
        const dependencyOutput = "dist/webmanifest.json";
        const graph: Graph = {
          [input]: {
            [DependencyType.Import]: {
              filePath: input,
              output: inputOutput,
              dependencies: {
                imports: {
                  [dependency]: {
                    specifiers: {},
                    defaults: [],
                    namespaces: [],
                    type: DependencyType.Import,
                    format: Format.Json,
                  },
                },
                exports: {},
              },
              format: Format.Style,
            },
          },
          [dependency]: {
            [DependencyType.Import]: {
              filePath: dependency,
              output: dependencyOutput,
              dependencies: { imports: {}, exports: {} },
              format: Format.Json,
            },
          },
        };
        const plugin = posthtmlInjectLinkDependencies(
          input,
          inputOutput,
          { importMap, graph },
        );
        const processor = posthtml([plugin]);

        const source =
          `<html><head><link rel="manifest" href="webmanifest.json"></div></head></html>`;
        const { html } = await processor.process(source);

        assertStringIncludes(
          html,
          `<html><head><link rel="manifest" href="./webmanifest.json"></head></html>`,
        );
      },
    },

    {
      name: "script",
      async fn() {
        const importMap = { imports: {} };
        const input = "src/a.html";
        const inputOutput = "dist/a.html";
        const dependency = "src/b.js";
        const dependencyOutput = "dist/b.js";
        const graph: Graph = {
          [input]: {
            [DependencyType.Import]: {
              filePath: input,
              output: inputOutput,
              dependencies: {
                imports: {
                  [dependency]: {
                    specifiers: {},
                    defaults: [],
                    namespaces: [],
                    type: DependencyType.Import,
                    format: Format.Script,
                  },
                },
                exports: {},
              },
              format: Format.Style,
            },
          },
          [dependency]: {
            [DependencyType.Import]: {
              filePath: dependency,
              output: dependencyOutput,
              dependencies: { imports: {}, exports: {} },
              format: Format.Script,
            },
          },
        };
        const plugin = posthtmlInjectScriptDependencies(
          input,
          inputOutput,
          { importMap, graph },
        );
        const processor = posthtml([plugin]);

        const source = `<html><body><script src="b.js"></script></body></html>`;
        const { html } = await processor.process(source);

        assertStringIncludes(
          html,
          `<html><body><script src="./b.js"></script></body></html>`,
        );
      },
    },

    {
      name: "style",
      async fn() {
        const use: postcss.AcceptedPlugin[] = [];
        const input = "src/a.html";
        const inputOutput = "dist/a.html";
        const dependency = "src/b.css";
        const dependencyOutput = "dist/b.css";
        const graph: Graph = {
          [input]: {
            [DependencyType.Import]: {
              filePath: input,
              output: inputOutput,
              dependencies: {
                imports: {
                  [dependency]: {
                    specifiers: {},
                    defaults: [],
                    namespaces: [],
                    type: DependencyType.Import,
                    format: Format.Style,
                  },
                },
                exports: {},
              },
              format: Format.Style,
            },
          },
          [dependency]: {
            [DependencyType.Import]: {
              filePath: dependency,
              output: dependencyOutput,
              dependencies: { imports: {}, exports: {} },
              format: Format.Style,
            },
          },
        };
        const chunk: Chunk = {
          history: [input],
          dependencies: [
            {
              history: [dependency, input],
              type: DependencyType.Import,
              format: Format.Style,
            },
          ],
          type: DependencyType.Import,
          format: Format.Html,
        };
        const bundler = new Bundler([]);
        const sources = {
          "src/b.css": `div { color: red; }`,
        };
        const context: Context = {
          bundler,
          outputMap: {},
          importMap: { imports: {} },
          sources,
          cacheDirPath: "dist/.cache",
          depsDirPath: "dist/deps",
          outDirPath: "dist",
          reload: false,
          optimize: false,
          quiet: false,
          cache: {},
          graph,
          chunks: [chunk],
          bundles: {},
        };

        const plugin = posthtmlInjectStyleDependencies(
          chunk,
          context,
          use,
        );
        const processor = posthtml([plugin]);

        const source =
          `<html><head><style>@import "b.css";</style></head></html>`;
        const { html } = await processor.process(source);

        assertStringIncludes(
          html,
          `<html><head><style>div { color: red; }</style></head></html>`,
        );
      },
    },

    {
      name: "inline style",
      async fn() {
        const use: postcss.AcceptedPlugin[] = [];
        const input = "src/a.html";
        const inputOutput = "dist/a.html";
        const dependency = "src/b.png";
        const dependencyOutput = "dist/b.png";
        const graph: Graph = {
          [input]: {
            [DependencyType.Import]: {
              filePath: input,
              output: inputOutput,
              dependencies: {
                imports: {
                  [dependency]: {
                    specifiers: {},
                    defaults: [],
                    namespaces: [],
                    type: DependencyType.Import,
                    format: Format.Image,
                  },
                },
                exports: {},
              },
              format: Format.Style,
            },
          },
          [dependency]: {
            [DependencyType.Import]: {
              filePath: dependency,
              output: dependencyOutput,
              dependencies: { imports: {}, exports: {} },
              format: Format.Image,
            },
          },
        };
        const chunk: Chunk = {
          history: [input],
          dependencies: [
            {
              history: [dependency, input],
              type: DependencyType.Import,
              format: Format.Image,
            },
          ],
          type: DependencyType.Import,
          format: Format.Html,
        };
        const bundler = new Bundler([]);
        const context: Context = {
          bundler,
          outputMap: {},
          importMap: { imports: {} },
          sources: {},
          cacheDirPath: "dist/.cache",
          depsDirPath: "dist/deps",
          outDirPath: "dist",
          reload: false,
          optimize: false,
          quiet: false,
          cache: {},
          graph,
          chunks: [chunk],
          bundles: {},
        };
        const plugin = posthtmlInjectInlineStyleDependencies(
          chunk,
          context,
          use,
        );
        const processor = posthtml([plugin]);

        const source =
          `<html><body><div style="background: url('b.png')"></div></body></html>`;
        const { html } = await processor.process(source);

        assertStringIncludes(
          html,
          `<html><body><div style="background: url('./b.png')"></div></body></html>`,
        );
      },
    },
  ],
});
