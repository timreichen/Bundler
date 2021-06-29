import { ts } from "../../../deps.ts";
import { assertEqualsIgnoreWhitespace, tests } from "../../../test_deps.ts";
import { typescriptTransformDynamicImportTransformer } from "./dynamic_imports.ts";

const printer: ts.Printer = ts.createPrinter({ removeComments: false });

function transformDynamicImport(fileName: string, sourceText: string) {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
  );
  const { transformed } = ts.transform(
    sourceFile,
    [typescriptTransformDynamicImportTransformer()],
  );
  return printer.printFile(transformed[0] as ts.SourceFile);
}

tests({
  name: "typescript transfomer → dynamic imports",
  tests: () => [
    {
      name: "static string",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `import("./x.ts");`;
        const transformedSource = transformDynamicImport(fileName, sourceText);
        assertEqualsIgnoreWhitespace(
          transformedSource,
          `import("./x.ts").then(async (mod) => await mod.default);`,
        );
      },
    },
    {
      name: "dynamic string",
      fn() {
        const fileName = "src/a.ts";
        const sourceText =
          `const extension = ".ts"; import("./x" + extension);`;
        const transformedSource = transformDynamicImport(fileName, sourceText);
        assertEqualsIgnoreWhitespace(
          transformedSource,
          `const extension = ".ts"; import("./x" + extension); `,
        );
      },
    },
  ],
});
