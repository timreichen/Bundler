import { ts } from "../../deps.ts";
import type { Graph } from "../../graph.ts";
import { Plugin, PluginTest } from "../plugin.ts";

interface Config {
  test: PluginTest;
}

const printer: ts.Printer = ts.createPrinter({ removeComments: false });

export function text(
  { test }: Config,
) {
  const fn = (input: string, source: string, { graph }: { graph: Graph }) => {
    const identifier = `\`${source}\``;
    const ast = ts.createExportDefault(ts.createIdentifier(identifier));
    const string = printer.printList(
      undefined,
      ts.createNodeArray([ast]),
      undefined,
    );
    graph[input].exports["default"] = { input };
    return string;
  };

  return new Plugin({
    test,
    fn,
  });
}
