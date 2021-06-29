import { Bundler } from "../../../bundler.ts";
import { postcss, posthtml } from "../../../deps.ts";
import { Graph } from "../../../graph.ts";
import { Logger, logLevels } from "../../../logger.ts";
import { assertStringIncludes, tests } from "../../../test_deps.ts";
import { Chunk, Context, DependencyType } from "../../plugin.ts";
import {
  posthtmlInjectImageDependencies,
  posthtmlInjectInlineStyleDependencies,
  posthtmlInjectLinkDependencies,
  posthtmlInjectScriptDependencies,
  posthtmlInjectStyleDependencies,
} from "./inject_dependencies.ts";
tests({
  name: "posthtml plugin → inject dependencies",
  tests: () => [
    {
      name: "importMap",
      async fn() {
        const importMap = {
          imports: {
            "path/": "custom/path/",
          },
        };
        const inputA = "src/a.html";
        const outputA = "dist/a.html";
        const inputB = "custom/path/b.png";
        const outputB = "b.png";

        const graph: Graph = {
          [inputA]: [{
            input: inputA,
            output: outputA,
            dependencies: {
              [inputB]: {
                [DependencyType.Import]: {},
              },
            },
            export: {},
            type: DependencyType.Import,
          }],
          [inputB]: [{
            input: inputB,
            output: outputB,
            dependencies: {},
            export: {},
            type: DependencyType.Import,
          }],
        };
        const plugin = posthtmlInjectImageDependencies(
          inputA,
          outputB,
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
        const inputA = "a.html";
        const ounputA = "dist/a.html";
        const inputB = "custom/path/b.png";
        const outputB = "dist/b.png";
        const graph: Graph = {
          [inputA]: [{
            input: inputA,
            output: ounputA,
            dependencies: {
              [inputB]: {
                [DependencyType.Import]: {},
              },
            },
            export: {},
            type: DependencyType.Import,
          }],
          [inputB]: [
            {
              input: inputB,
              output: outputB,
              dependencies: {},
              export: {},
              type: DependencyType.Import,
            },
          ],
        };
        const plugin = posthtmlInjectImageDependencies(
          inputA,
          ounputA,
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
        const inputA = "a.html";
        const ounputA = "dist/a.html";
        const inputB = "custom/path/b.png";
        const outputB = "dist/b.png";
        const graph: Graph = {
          [inputA]: [{
            input: inputA,
            output: ounputA,
            dependencies: {
              [inputB]: {
                [DependencyType.Import]: {},
              },
            },
            export: {},
            type: DependencyType.Import,
          }],
          [inputB]: [
            {
              input: inputB,
              output: outputB,
              dependencies: {},
              export: {},
              type: DependencyType.Import,
            },
          ],
        };
        const plugin = posthtmlInjectImageDependencies(
          inputA,
          ounputA,
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
        const inputA = "src/a.html";
        const ounputA = "dist/a.html";
        const inputB = "src/b.css";
        const outputB = "dist/b.css";
        const graph: Graph = {
          [inputA]: [{
            input: inputA,
            output: ounputA,
            dependencies: {
              [inputB]: {
                [DependencyType.Import]: {},
              },
            },
            export: {},
            type: DependencyType.Import,
          }],
          [inputB]: [
            {
              input: inputB,
              output: outputB,
              dependencies: {},
              export: {},
              type: DependencyType.Import,
            },
          ],
        };
        const plugin = posthtmlInjectLinkDependencies(
          inputA,
          ounputA,
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
        const inputA = "src/a.html";
        const ounputA = "a.html";
        const inputB = "src/b.css";
        const outputB = "dist/b.css";
        const graph: Graph = {
          [inputA]: [{
            input: inputA,
            output: ounputA,
            dependencies: {
              [inputB]: {
                [DependencyType.Import]: {},
              },
            },
            export: {},
            type: DependencyType.Import,
          }],
          [inputB]: [
            {
              input: inputB,
              output: outputB,
              dependencies: {},
              export: {},
              type: DependencyType.Import,
            },
          ],
        };
        const plugin = posthtmlInjectLinkDependencies(
          inputA,
          ounputA,
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
        const inputA = "src/a.html";
        const ounputA = "dist/a.html";
        const inputB = "src/b.css";
        const outputB = "b.css";
        const graph: Graph = {
          [inputA]: [{
            input: inputA,
            output: ounputA,
            dependencies: {
              [inputB]: {
                [DependencyType.Import]: {},
              },
            },
            export: {},
            type: DependencyType.Import,
          }],
          [inputB]: [
            {
              input: inputB,
              output: outputB,
              dependencies: {},
              export: {},
              type: DependencyType.Import,
            },
          ],
        };
        const plugin = posthtmlInjectLinkDependencies(
          inputA,
          ounputA,
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
        const inputA = "src/a.html";
        const ounputA = "dist/a.html";
        const inputB = "src/webmanifest.json";
        const outputB = "dist/webmanifest.json";
        const graph: Graph = {
          [inputA]: [{
            input: inputA,
            output: ounputA,
            dependencies: {
              [inputB]: {
                [DependencyType.Import]: {},
              },
            },
            export: {},
            type: DependencyType.Import,
          }],
          [inputB]: [
            {
              input: inputB,
              output: outputB,
              dependencies: {},
              export: {},
              type: DependencyType.WebManifest,
            },
          ],
        };
        const plugin = posthtmlInjectLinkDependencies(
          inputA,
          ounputA,
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
        const inputA = "src/a.html";
        const ounputA = "dist/a.html";
        const inputB = "src/b.js";
        const outputB = "dist/b.js";
        const graph: Graph = {
          [inputA]: [{
            input: inputA,
            output: ounputA,
            dependencies: {
              [inputB]: {
                [DependencyType.Import]: {},
              },
            },
            export: {},
            type: DependencyType.Import,
          }],
          [inputB]: [
            {
              input: inputB,
              output: outputB,
              dependencies: {},
              export: {},
              type: DependencyType.Import,
            },
          ],
        };
        const plugin = posthtmlInjectScriptDependencies(
          inputA,
          ounputA,
          { importMap, graph },
        );
        const processor = posthtml([plugin]);

        const source = `<html><body><script src="b.js"></script></body></html>`;
        const { html } = await processor.process(source);

        assertStringIncludes(
          html,
          `<html><body><script src="./b.js" type="module"></script></body></html>`,
        );
      },
    },

    {
      name: "style",
      async fn() {
        const use: postcss.AcceptedPlugin[] = [];
        const inputA = "src/a.html";
        const ounputA = "dist/a.html";
        const inputB = "src/b.css";
        const outputB = "dist/b.css";
        const graph: Graph = {
          [inputA]: [{
            input: inputA,
            output: ounputA,
            dependencies: {
              [inputB]: {
                [DependencyType.Import]: {},
              },
            },
            export: {},
            type: DependencyType.Import,
          }],
          [inputB]: [
            {
              input: inputB,
              output: outputB,
              dependencies: {},
              export: {},
              type: DependencyType.Import,
            },
          ],
        };
        const chunk: Chunk = {
          item: {
            history: [inputA],
            type: DependencyType.Import,
          },
          dependencyItems: [
            {
              history: [inputB, inputA],
              type: DependencyType.Import,
            },
          ],
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
          logger: new Logger({ logLevel: logLevels.info }),
          bundles: {},
        };
        const item = chunk.item;
        const plugin = posthtmlInjectStyleDependencies(
          item,
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
        const inputA = "src/a.html";
        const ounputA = "dist/a.html";
        const inputB = "src/b.png";
        const outputB = "dist/b.png";
        const graph: Graph = {
          [inputA]: [{
            input: inputA,
            output: ounputA,
            dependencies: {
              [inputB]: {
                [DependencyType.Import]: {},
              },
            },
            export: {},
            type: DependencyType.Import,
          }],
          [inputB]: [{
            input: inputB,
            output: outputB,
            dependencies: {},
            export: {},
            type: DependencyType.Import,
          }],
        };
        const chunk: Chunk = {
          item: {
            history: [inputA],
            type: DependencyType.Import,
          },
          dependencyItems: [
            {
              history: [inputB, inputA],
              type: DependencyType.Import,
            },
          ],
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
          logger: new Logger({ logLevel: logLevels.info }),
          bundles: {},
        };
        const item = chunk.item;
        const plugin = posthtmlInjectInlineStyleDependencies(
          item,
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
