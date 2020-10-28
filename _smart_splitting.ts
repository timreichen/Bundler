import { bundleImportTransformer } from "./system.ts";

import { ts } from "./deps.ts";

const printer = ts.createPrinter({ removeComments: false });

export function injectBundleImport(source: string, specifier: string): string {
  const sourceFile = ts.createSourceFile(
    "x.ts",
    source,
    ts.ScriptTarget.Latest,
  );

  const result = ts.transform(sourceFile, [bundleImportTransformer(specifier)]);

  return printer.printNode(
    ts.EmitHint.SourceFile,
    result.transformed[0],
    sourceFile,
  );
}

export function createModuleImport(
  specifier: string,
  filePath: string,
): string {
  const declaration = ts.createImportDeclaration(
    undefined,
    undefined,
    ts.createImportClause(
      undefined,
      ts.createNamespaceImport(ts.createIdentifier(specifier)),
      false,
    ),
    ts.createStringLiteral(filePath),
  );
  const sourceFile = ts.createSourceFile("x.ts", "", ts.ScriptTarget.Latest);
  return printer.printNode(ts.EmitHint.Unspecified, declaration, sourceFile);
}
