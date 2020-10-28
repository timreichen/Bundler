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
    const sourceFile = ts.createSourceFile(
      input,
      source,
      ts.ScriptTarget.Latest,
    );
    const string = printer.printList(
      ts.ListFormat.SourceFileStatements,
      ts.createNodeArray([ast]),
      sourceFile,
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
