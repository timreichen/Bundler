import { ImportMap, ts } from "../../deps.ts";
import { Loader, LoaderTest } from "../loader.ts";
import { getDynamicImportNode } from "../../typescript.ts";
import { resolve as resolveDependencySpecifier } from "../../dependencies.ts";
import { Exports, Imports } from "../../graph.ts";
function hasExportModifier(node: ts.Node) {
  return node.modifiers &&
    ts.getCombinedModifierFlags(node as ts.Declaration) &
      ts.ModifierFlags.Export;
}

export function typescriptLoader(
  { test = (input: string) => /\.(tsx?|jsx?)$/.test(input) }: {
    test?: LoaderTest;
  } = {},
) {
  return new Loader({
    test,
    fn: async (
      input: string,
      source: string,
      { importMap }: { importMap?: ImportMap } = {},
    ) => {
      const imports: Imports = {};
      const exports: Exports = {};

      const visit: ts.Visitor = (node: ts.Node) => {
        // console.log(ts.SyntaxKind[node.kind])
        // import declarations
        if (node.kind === ts.SyntaxKind.ImportDeclaration) {
          const importClause = node.importClause;
          if (!importClause?.isTypeOnly) {
            if (node.moduleSpecifier) {
              const specifier = node.moduleSpecifier.text;
              const resolvedSpecifier = resolveDependencySpecifier(
                input,
                specifier,
                importMap,
              );

              imports[resolvedSpecifier] = imports[resolvedSpecifier] ||
                { specifiers: [] };

              if (importClause) {
                if (importClause.namedBindings) {
                  if (importClause.namedBindings.elements) {
                    for (const element of importClause.namedBindings.elements) {
                      imports[resolvedSpecifier].specifiers.push(
                        element.name.escapedText,
                      );
                    }
                  } else {
                    imports[resolvedSpecifier].specifiers.push("*");
                  }
                } else {
                  imports[resolvedSpecifier].specifiers.push(
                    importClause.name.escapedText,
                  );
                }
              }
            }
          }
        }
        // dynamic imports
        if (
          node.kind === ts.SyntaxKind.CallExpression &&
          node.expression.kind === ts.SyntaxKind.ImportKeyword
        ) {
          const specifier = getDynamicImportNode(node, source).text;
          const resolvedSpecifier = resolveDependencySpecifier(
            input,
            specifier,
            importMap,
          );
          imports[resolvedSpecifier] = imports[resolvedSpecifier] ||
            { specifiers: [] };
          imports[resolvedSpecifier].dynamic = true;
        }

        // exports declarations
        if (node.kind === ts.SyntaxKind.ExportDeclaration) {
          if (node.exportClause) {
            if (!node.exportClause.isTypeOnly) {
              if (node.exportClause.elements) {
                // example: export { foo as bar }
                for (const element of node.exportClause.elements) {
                  const symbol = element.name.escapedText;
                  const specifier = node.moduleSpecifier
                    ? resolveDependencySpecifier(
                      input,
                      node.moduleSpecifier.text,
                      importMap,
                    )
                    : input;
                  exports[specifier] = exports[specifier] || { specifiers: [] };
                  exports[specifier].specifiers.push(symbol);
                }
              } else {
                // example: export * as foo from "./bar.ts"
                const symbol = node.exportClause.name.escapedText;

                const specifier = node.moduleSpecifier
                  ? resolveDependencySpecifier(
                    input,
                    node.moduleSpecifier.text,
                    importMap,
                  )
                  : input;
                exports[specifier] = exports[specifier] || { specifiers: [] };
                exports[specifier].specifiers.push(symbol);
              }
            }
          } else {
            // example: export * from "./foo.ts"
            const symbol = "*";
            const specifier = node.moduleSpecifier
              ? resolveDependencySpecifier(
                input,
                node.moduleSpecifier.text,
                importMap,
              )
              : input;
            exports[specifier] = exports[specifier] || { specifiers: [] };
            exports[specifier].specifiers.push(symbol);
          }
        }
        // export values
        if (hasExportModifier(node)) {
          if (node.declarationList) {
            // example: export const foo = "bar"
            for (const declaration of node.declarationList.declarations) {
              if (declaration.elements) {
                for (const element of declaration.elements) {
                  const symbol = element.escapedText;
                  exports[input] = exports[input] || { specifiers: [] };
                  exports[input].specifiers.push(symbol);
                }
              } else if (declaration.name) {
                const symbol = declaration.name.text;
                exports[input] = exports[input] || { specifiers: [] };
                exports[input].specifiers.push(symbol);
              }
            }
          } else {
            // example: export function foo() {}
            // example: export class bar {}
            const symbol = node.name.escapedText;
            exports[input] = exports[input] || { specifiers: [] };
            exports[input].specifiers.push(symbol);
          }
        }

        return ts.forEachChild(node, visit);
      };

      const sourceFile = ts.createSourceFile(input, source);

      ts.forEachChild(sourceFile, visit);

      return {
        imports,
        exports,
      };
    },
  });
}
