import type { Graph } from "../../graph.ts";
import { path, Sha256, xts } from "../../deps.ts";
import { Plugin, PluginTest } from "../plugin.ts";
import { addRelativePrefix } from "../../_util.ts";

interface Config {
  test?: PluginTest;
}

export function getSpecifier(specifier: string) {
  return `_${new Sha256().update(specifier).hex()}`;
}

export function cssInjectImports(
  { test = (input: string) => input.endsWith(".css") }: Config = {},
) {
  const printer: xts.Printer = xts.createPrinter({ removeComments: false });

  const fn = (input: string, source: string, { graph }: { graph: Graph }) => {
    const importNodes: { [input: string]: xts.Node } = {};
    const specifiers = Object.keys(graph[input].imports);
    for (const specifier of specifiers) {
      const sourceIdentifier = getSpecifier(specifier);
      const resolvedSpecifier = path.relative(path.dirname(input), specifier);

      const importNode = xts.createImportDeclaration(
        undefined,
        undefined,
        xts.createImportClause(
          xts.createIdentifier(sourceIdentifier),
          undefined,
          false,
        ),
        xts.createStringLiteral(addRelativePrefix(resolvedSpecifier)),
      );
      importNodes[sourceIdentifier] = importNode;
    }

    const string = printer.printList(
      undefined,
      xts.createNodeArray(Object.values(importNodes)),
      undefined,
    );

    const strings: string[] = [string, source];

    return strings.join("\n");
  };

  return new Plugin({
    test,
    fn,
  });
}
