import { Bundler } from "../../../bundler.ts";
import { postcss } from "../../../deps.ts";
import { Graph } from "../../../graph.ts";
import { assertEquals, tests } from "../../../test_deps.ts";
import { Chunk, Context, DependencyType, Format } from "../../plugin.ts";
import { postcssInjectImportsPlugin } from "./inject_imports.ts";

tests({
  name: "postcss plugin → inject imports",
  tests: () => [
    {
      name: "inline import",
      fn: async () => {
        const input = "input.css";
        const dependency = "dependency.css";
        const sources = {
          [input]: `@import "dependency.css";`,
          [dependency]: `div { color: red; }`,
        };
        const graph: Graph = {
          [input]: {
            [DependencyType.Import]: {
              filePath: input,
              output: "dist/input.css",
              dependencies: {
                imports: {
                  [dependency]: {
                    specifiers: {},
                    defaults: [],
                    namespaces: [],
                    types: {},
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
              output: "dist/dependency.css",
              dependencies: { imports: {}, exports: {} },
              format: Format.Style,
            },
          },
        };
        const chunk: Chunk = {
          item: {
            history: [input],
            type: DependencyType.Import,
            format: Format.Style,
          },
          dependencyItems: [{
            history: [dependency, input],
            type: DependencyType.Import,
            format: Format.Style,
          }],
        };
        const bundler = new Bundler([]);
        const context: Context = {
          bundler,
          outputMap: {},
          importMap: { imports: {} },
          sources,
          outDirPath: "dist",
          depsDirPath: "dist/deps",
          cacheDirPath: "dist/.cache",
          reload: false,
          optimize: false,
          quiet: false,
          cache: {},
          graph,
          chunks: [],
          bundles: {},
        };

        const plugin = postcssInjectImportsPlugin(chunk.item, context, []);
        const processor = postcss.default([plugin]);

        const { css } = await processor.process(sources[input]);

        assertEquals(css, `div { color: red; }`);
      },
    },
    // {
    //   name: "replace import path",
    //   fn: async () => {
    //     const input = "input.css";
    //     const dependency = "dependency.css";
    //     const sources = {
    //       [input]: `@import "dependency.css";`,
    //       [dependency]: `div { color: red; }`,
    //     };
    //     const chunk: Chunk = {
    //       item: {
    //         history: [input],
    //         type: DependencyType.Import,
    //         format: Format.Style,
    //       },
    //       dependencyItems: [
    //         {
    //           history: [dependency, input],
    //           type: DependencyType.Import,
    //           format: Format.Style,
    //         },
    //       ],
    //     };
    //     const dependencyChunk: Chunk = {
    //       item: {
    //         history: [dependency, input],
    //         type: DependencyType.Import,
    //         format: Format.Style,
    //       },
    //       dependencyItems: [],
    //     };
    //     const graph: Graph = {
    //       [input]: {
    //         [DependencyType.Import]: {
    //           filePath: input,
    //           output: "dist/input.css",
    //           dependencies: {
    //             imports: {
    //               [dependency]: {
    //                 specifiers: {},
    //                 defaults: [],
    //                 namespaces: [],
    //                 types: {},
    //                 type: DependencyType.Import,
    //                 format: Format.Style,
    //               },
    //             },
    //             exports: {},
    //           },
    //           format: Format.Style,
    //         },
    //       },
    //       [dependency]: {
    //         [DependencyType.Import]: {
    //           filePath: dependency,
    //           output: "dist/dependency.css",
    //           dependencies: { imports: {}, exports: {} },
    //           format: Format.Style,
    //         },
    //       },
    //     };
    //     const bundler = new Bundler([]);
    //     const context: Context = {
    //       bundler,
    //       outputMap: {},
    //       importMap: { imports: {} },
    //       sources,
    //       outDirPath: "dist",
    //       depsDirPath: "dist/deps",
    //       cacheDirPath: "dist/.cache",
    //       reload: false,
    //       optimize: false,
    //       quiet: false,
    //       cache: {},
    //       graph,
    //       chunks: [chunk, dependencyChunk],
    //       bundles: {},
    //     };

    //     const plugin = postcssInjectImportsPlugin(chunk.item, context, []);
    //     const processor = postcss.default([plugin]);

    //     const source = `@import "dependency.css";`;
    //     const { css } = await processor.process(source);

    //     assertEquals(css, `@import "./dependency.css";`);
    //   },
    // },
  ],
});
