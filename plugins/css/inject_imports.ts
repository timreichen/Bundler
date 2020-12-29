import { Bundler } from "../../bundler.ts";
import { path, ts } from "../../deps.ts";
import { Graph } from "../../graph.ts";
import { addRelativePrefix } from "../../_util.ts";
import { Data, Plugin, Source, TestFunction } from "../plugin.ts";

const printer: ts.Printer = ts.createPrinter({ removeComments: false });

export class CssInjectImportsPlugin extends Plugin {
  imports: Record<string, Record<string, string>>;
  constructor(
    { test = (input: string) => input.endsWith(".css"), imports = {} }: {
      test?: TestFunction;
      imports: Record<string, Record<string, string>>;
    },
  ) {
    super({ test });
    this.imports = imports;
  }
  async transform(
    input: string,
    source: Source,
    bundleInput: string,
    data: Data,
  ) {
    const imports = this.imports[input];

    const importNodes: { [input: string]: ts.Node } = {};
    for (const [outputFilePath, identifier] of Object.entries(imports)) {
      const resolvedSpecifier = path.relative(
        path.dirname(input),
        outputFilePath,
      );

      const importNode = ts.factory.createImportDeclaration(
        undefined,
        undefined,
        ts.factory.createImportClause(
          false,
          ts.factory.createIdentifier(identifier),
          undefined,
        ),
        ts.factory.createStringLiteral(addRelativePrefix(resolvedSpecifier)),
      );
      importNodes[identifier] = importNode;
    }
    const sourceFile = ts.createSourceFile(
      input,
      source as string,
      ts.ScriptTarget.Latest,
    );
    const string = printer.printList(
      ts.ListFormat.SourceFileStatements,
      ts.factory.createNodeArray(Object.values(importNodes)),
      sourceFile,
    );

    const strings: string[] = [string, source as string];

    return strings.join("\n");
  }
}
