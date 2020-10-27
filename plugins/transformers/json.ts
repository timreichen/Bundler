import { Plugin, PluginTest } from "../plugin.ts";

import { xts } from "../../deps.ts";
import type { Graph } from "../../graph.ts";

interface Config {
  test?: PluginTest;
  optimize?: boolean;
}

const printer: xts.Printer = xts.createPrinter({ removeComments: false });

export function json(
  {
    test = (input: string) => input.endsWith(".json"),
    optimize = false,
  }: Config = {},
) {
  const fn = async (
    input: string,
    source: string,
    { graph }: { graph: Graph },
  ) => {
    if (optimize) {
      source = JSON.stringify(JSON.parse(source));
    }
    const ast = xts.createExportDefault(xts.createIdentifier(source));
    const string = printer.printList(
      undefined,
      xts.createNodeArray([ast]),
      undefined,
    );
    const entry = graph[input];
    entry.exports[input] = entry.exports[input] || { specifiers: [] };
    entry.exports[input].specifiers.push("default");

    return string;
  };

  return new Plugin({
    test,
    fn,
  });
}
