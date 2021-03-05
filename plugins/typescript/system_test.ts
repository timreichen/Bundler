import { ts } from "../../deps.ts";
import { assertStringIncludes } from "../../test_deps.ts";
import { createSystemExports } from "./system.ts";

const printer: ts.Printer = ts.createPrinter({ removeComments: false });

Deno.test({
  name: "[system plugin] createSystemExports",
  fn: async () => {
    const sourceFile = ts.createSourceFile("x.ts", "", ts.ScriptTarget.Latest);
    const ExportNodes = createSystemExports(["a", "b"]);
    const ExportStrings = printer.printList(
      ts.ListFormat.SourceFileStatements,
      ExportNodes,
      sourceFile,
    );

    assertStringIncludes(ExportStrings, `export const a = __exp["a"];`);
    assertStringIncludes(ExportStrings, `export const b = __exp["b"];`);
  },
});
