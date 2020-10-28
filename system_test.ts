import { ts } from "./deps.ts";
import {
  createSystemExports,
  injectInstantiateNameTransformer,
} from "./system.ts";
import { assert, assertEquals } from "./test_deps.ts";

Deno.test({
  name: "injectInstantiateName",
  fn: async () => {
    const fileName = "a.ts";
    const sourceText =
      `System.register([], function (exports_1, context_1) { });`;
    const specifier = "./x.js";
    const sourceFile = ts.createSourceFile(
      fileName,
      sourceText,
      ts.ScriptTarget.Latest,
    );
    const { transformed } = ts.transform(
      sourceFile,
      [injectInstantiateNameTransformer(specifier)],
    );
    const newSourceFile = transformed[0] as ts.SourceFile;
    const printer = ts.createPrinter({ removeComments: false });
    assert(
      printer.printFile(newSourceFile).startsWith(
        `System.register("${specifier}", []`,
      ),
    );
  },
});

Deno.test({
  name: "createSystemExports",
  fn: async () => {
    const ExportStrings = createSystemExports(["a", "b"]);
    assertEquals(ExportStrings[0], `export const a = __exp["a"];`);
    assertEquals(ExportStrings[1], `export const b = __exp["b"];`);
  },
});
