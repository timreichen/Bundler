import { Bundler } from "../../../bundler.ts";
import { postcss } from "../../../deps.ts";
import { Graph } from "../../../graph.ts";
import { Logger, logLevels } from "../../../logger.ts";
import { assertEquals, tests } from "../../../test_deps.ts";
import { Chunk, Context, DependencyType } from "../../plugin.ts";
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
          [input]: [{
            input,
            output: "dist/input.css",
            dependencies: {
              [dependency]: {
                [DependencyType.Import]: {},
              },
            },
            export: {},
            type: DependencyType.Import,
          }],
          [dependency]: [{
            input: dependency,
            output: "dist/dependency.css",
            dependencies: {},
            export: {},
            type: DependencyType.Import,
          }],
        };
        const chunk: Chunk = {
          item: {
            history: [input],
            type: DependencyType.Import,
          },
          dependencyItems: [{
            history: [dependency, input],
            type: DependencyType.Import,
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
          logger: new Logger({ logLevel: logLevels.info }),
          bundles: {},
        };

        const plugin = postcssInjectImportsPlugin(chunk.item, context, []);
        const processor = postcss.default([plugin]);

        const { css } = await processor.process(sources[input]);

        assertEquals(css, `div { color: red; }`);
      },
    },
  ],
});
