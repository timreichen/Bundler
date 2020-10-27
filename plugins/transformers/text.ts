import { xts } from "../../deps.ts";
import type { Graph } from "../../graph.ts";
import { Plugin, PluginTest } from "../plugin.ts";

interface Config {
  test: PluginTest;
}

const printer: xts.Printer = xts.createPrinter({ removeComments: false });

export function text(
  { test }: Config,
) {
  const fn = (input: string, source: string, { graph }: { graph: Graph }) => {
    const identifier = `\`${source}\``;
    const ast = xts.createExportDefault(xts.createIdentifier(identifier));
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
