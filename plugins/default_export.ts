import { ts } from "../deps.ts";
import { Data, Plugin, Source } from "./plugin.ts";

const printer: ts.Printer = ts.createPrinter({ removeComments: false });

export class DefaultExportPlugin extends Plugin {
  async transform(
    input: string,
    source: Source,
    bundleInput: string,
    data: Data,
  ) {
    const identifier = ts.createIdentifier(source as string);
    const ast = ts.createExportDefault(identifier);
    const sourceFile = ts.createSourceFile(
      input,
      source as string,
      ts.ScriptTarget.Latest,
    );
    return printer.printList(
      ts.ListFormat.SourceFileStatements,
      ts.createNodeArray([ast]),
      sourceFile,
    );
  }
}
