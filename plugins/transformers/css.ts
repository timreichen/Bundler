import { Plugin, PluginTest } from "../plugin.ts";

import { postcss as postcssCore } from "../../deps.ts";
import { postcss } from "./postcss.ts";
import { csso } from "./csso.ts";
import { cssInjectImports } from "./css_inject_imports.ts";
import { cssInjectSpecifiers } from "./css_inject_specifiers.ts";
import { text } from "./text.ts";
import type { ImportMap } from "../../deps.ts";
import type { FileMap, Graph } from "../../graph.ts";

interface Config {
  test?: PluginTest;
  optimize?: boolean;
  use?: postcssCore.AcceptedPlugin[];
}

function removeImports() {
  return {
    postcssPlugin: "remove-imports",
    AtRule: {
      import(atRule: { remove: () => unknown }) {
        atRule.remove();
      },
    },
  };
}

export function css(
  {
    test = (input: string) => input.endsWith(".css"),
    use = [],
    optimize = false,
  }: Config = {},
) {
  const transformers = [
    postcss({
      use: [
        ...use,
        removeImports(),
      ],
    }),
    csso({
      test: (input: string) => optimize && test(input),
    }),
    cssInjectSpecifiers(),
    text({ test }),
    cssInjectImports(),
  ];

  const fn = async (
    input: string,
    source: string,
    { graph, fileMap, importMap, outDir, depsDir }: {
      graph: Graph;
      fileMap: FileMap;
      importMap: ImportMap;
      outDir: string;
      depsDir: string;
    },
  ) => {
    for (const transformer of transformers) {
      source = await transformer.fn(
        input,
        source,
        { graph, fileMap, importMap, outDir, depsDir },
      );
    }
    return source;
  };

  return new Plugin({
    test,
    fn,
  });
}
