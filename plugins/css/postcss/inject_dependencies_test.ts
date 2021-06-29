import { assertEqualsIgnoreWhitespace, tests } from "../../../test_deps.ts";
import { Graph } from "../../../graph.ts";
import { DependencyType } from "../../plugin.ts";
import { injectDependencies } from "./inject_dependencies.ts";

tests({
  name: "postcss plugin → inject dependencies",
  tests: () => [
    {
      name: "url()",
      async fn() {
        const inputA = "src/a.css";
        const outputA = "dist/a.css";
        const inputB = "src/image.png";
        const outputB = "dist/image.png";
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

        const source = `div { background-image: url("image.png"); }`;
        const transformedSource = await injectDependencies(
          inputA,
          outputA,
          source,
          { graph },
        );
        assertEqualsIgnoreWhitespace(
          transformedSource,
          `div { background-image: url("./image.png"); }`,
        );
      },
    },

    {
      name: "url() level up",
      async fn() {
        const inputA = "src/a.css";
        const outputA = "dist/a.css";
        const inputB = "src/image.png";
        const outputB = "image.png";
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
        const source = `div { background-image: url("image.png"); }`;
        const transformedSource = await injectDependencies(
          inputA,
          outputA,
          source,
          { graph },
        );
        assertEqualsIgnoreWhitespace(
          transformedSource,
          `div { background-image: url("../image.png"); }`,
        );
      },
    },

    {
      name: "url() level down",
      async fn() {
        const inputA = "src/a.css";
        const outputA = "a.css";
        const inputB = "src/image.png";
        const outputB = "dist/image.png";
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
        const source = `div { background-image: url("image.png"); }`;
        const transformedSource = await injectDependencies(
          inputA,
          outputA,
          source,
          { graph },
        );
        assertEqualsIgnoreWhitespace(
          transformedSource,
          `div { background-image: url("./dist/image.png"); }`,
        );
      },
    },
  ],
});
