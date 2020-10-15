import { Plugin, PluginTest } from "../plugin.ts";

import { ts } from "../../deps.ts";
import type { Graph } from "../../graph.ts";

interface Config {
  test?: PluginTest;
}

const printer: ts.Printer = ts.createPrinter({ removeComments: false });

export function json(
  {
    test = (input: string) => input.endsWith(".json"),
  }: Config = {},
) {

  const fn = async (
    input: string,
    source: string,
    { graph }: { graph: Graph;},
  ) => {
    const ast = ts.createExportDefault(ts.createIdentifier(source));
    const string = printer.printList(
      undefined,
      ts.createNodeArray([ast]),
      undefined,
    );
    const entry = graph[input];
    entry.exports[input] = entry.exports[input] || [];
    entry.exports[input].push("default");
    
    return string;
  };

  return new Plugin({
    test,
    fn,
  });
}
