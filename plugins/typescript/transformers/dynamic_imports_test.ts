import { ts } from "../../../deps.ts";
import { assertEquals, assertStringIncludes } from "../../../test_deps.ts";
import { typescriptTransformDynamicImportTransformer } from "./dynamic_imports.ts";

const printer: ts.Printer = ts.createPrinter({ removeComments: false });

Deno.test({
  name: "[typescript dynamic imports transfomer] dynamic import",
  fn() {
    const fileName = "src/a.ts";
    const sourceText = `import("./x.ts")`;
    const sourceFile = ts.createSourceFile(
      fileName,
      sourceText,
      ts.ScriptTarget.Latest,
    );
    const { transformed, diagnostics } = ts.transform(
      sourceFile,
      [typescriptTransformDynamicImportTransformer()],
    );
    const outputText = printer.printFile(transformed[0]);
    assertEquals(diagnostics, []);
    assertStringIncludes(
      outputText,
      `import("./x.ts").then(async (data) => await data.default)`,
    );
  },
});
