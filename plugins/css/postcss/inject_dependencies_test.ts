import { assertStringIncludes, tests } from "../../../test_deps.ts";
import { postcss } from "../../../deps.ts";
import { Graph } from "../../../graph.ts";
import { DependencyType, Format } from "../../plugin.ts";
import { postcssInjectDependenciesPlugin } from "./inject_dependencies.ts";

tests({
  name: "postcss inject dependencies plugin",
  tests: () => [
    {
      name: "url()",
      async fn() {
        const input = "src/a.css";
        const inputOutput = "dist/a.css";
        const dependency = "src/image.png";
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
              output: "dist/image.png",
              dependencies: { imports: {}, exports: {} },
              format: Format.Image,
            },
          },
        };
        const plugin = postcssInjectDependenciesPlugin(
          input,
          "dist/a.css",
          { graph },
        );
        const processor = postcss.default([plugin]);

        const source = `div { background-image: url("image.png"); }`;
        const { css } = await processor.process(source);
        assertStringIncludes(
          css,
          `div { background-image: url("./image.png"); }`,
        );
      },
    },

    {
      name: "url() level up",
      async fn() {
        const input = "src/a.css";
        const inputOutput = "dist/a.css";
        const dependency = "src/image.png";
        const dependencyOutput = "image.png";
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
        const plugin = postcssInjectDependenciesPlugin(
          input,
          inputOutput,
          { graph },
        );
        const processor = postcss.default([plugin]);

        const source = `div { background-image: url("image.png"); }`;
        const { css } = await processor.process(source);
        assertStringIncludes(
          css,
          `div { background-image: url("../image.png"); }`,
        );
      },
    },

    {
      name: "url() level down",
      async fn() {
        const input = "src/a.css";
        const inputOutput = "a.css";
        const dependency = "src/image.png";
        const dependencyOutput = "dist/image.png";
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
        const plugin = postcssInjectDependenciesPlugin(
          input,
          inputOutput,
          { graph },
        );
        const processor = postcss.default([plugin]);

        const source = `div { background-image: url("image.png"); }`;
        const { css } = await processor.process(source);
        assertStringIncludes(
          css,
          `div { background-image: url("./dist/image.png"); }`,
        );
      },
    },
  ],
});

// Deno.test({
//   name: "@import",
//   async fn() {
//     const input = "src/a.css";
//     const inputOutput = "dist/a.css";
//     const dependency = "src/b.css";
//     const graph: Graph = {
//       [input]: {
//         [DependencyType.Import]: {
//           filePath: input,
//           output: inputOutput,
//           dependencies: {
//             imports: {
//               [dependency]: {
//                 specifiers: {},
//                 defaults: [],
//                 namespaces: [],
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
//           output: "dist/out.css",
//           dependencies: { imports: {}, exports: {} },
//           format: Format.Style,
//         },
//       },
//     };
//     const plugin = postcssInjectDependenciesPlugin(input, inputOutput, {
//       graph,
//     });
//     const processor = postcss.default([plugin]);

//     const source = `@import "./b.css";`;
//     const { css } = await processor.process(source);
//     assertStringIncludes(css, `@import "./out.css";`);
//   },
// });

// Deno.test({
//   name: "@import url()",
//   async fn() {
//     const input = "src/a.css";
//     const inputOutput = "dist/a.css";
//     const dependency = "src/b.css";
//     const graph: Graph = {
//       [input]: {
//         [DependencyType.Import]: {
//           filePath: input,
//           output: inputOutput,
//           dependencies: {
//             imports: {
//               [dependency]: {
//                 specifiers: {},
//                 defaults: [],
//                 namespaces: [],
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
//           output: "dist/out.css",
//           dependencies: { imports: {}, exports: {} },
//           format: Format.Style,
//         },
//       },
//     };
//     const plugin = postcssInjectDependenciesPlugin(input, inputOutput, {
//       graph,
//     });
//     const processor = postcss.default([plugin]);

//     const source = `@import url("./b.css");`;
//     const { css } = await processor.process(source);
//     assertStringIncludes(css, `@import url("./out.css");`);
//   },
// });
