import { Plugin, PluginTest } from "../plugin.ts";

import { ts } from "../../deps.ts";
import type { Graph } from "../../graph.ts";

interface Config {
  test?: PluginTest;
  optimize?: boolean;
}

const printer: ts.Printer = ts.createPrinter({ removeComments: false });

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
    const ast = ts.createExportDefault(ts.createIdentifier(source));
    const string = printer.printList(
      undefined,
      ts.createNodeArray([ast]),
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
