import { colors, ts } from "../../../deps.ts";
import { isURL } from "../../../_util.ts";
import {
  Dependencies,
  DependencyType,
  Format,
  getFormat,
} from "../../plugin.ts";

export function typescriptExtractDependenciesTransformer(
  { imports, exports }: Dependencies,
) {
  return (context: ts.TransformationContext) => {
    function createVisitor(sourceFile: ts.SourceFile): ts.Visitor {
      const visit: ts.Visitor = (node: ts.Node) => {
        let filePath = ".";
        if (ts.isImportDeclaration(node)) {
          const importClause = node.importClause;
          if (importClause?.isTypeOnly) return node;
          const moduleSpecifier = node.moduleSpecifier;
          if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
            filePath = moduleSpecifier.text;
          }
          const format = getFormat(filePath) || Format.Script;
          imports[filePath] = imports[filePath] ||
            {
              specifiers: [],
              type: DependencyType.Import,
              format,
            };
          if (importClause) {
            importClause.getChildren(sourceFile).forEach((child) => {
              if (ts.isNamespaceImport(child)) {
                // import * as x from "./x.ts"
                imports[filePath].specifiers.push("*");
              } else if (ts.isIdentifier(child)) {
                // import x from "./x.ts"
                imports[filePath].specifiers.push("default");
              } else if (ts.isNamedImports(child)) {
                // import { x } from "./x.ts"
                imports[filePath].specifiers.push(
                  ...child.elements.map((element) =>
                    // import { x as k } from "./x.ts"
                    (element.propertyName?.escapedText ||
                      element.name.escapedText) as string
                  ),
                );
              }
            });
          }
          return node;
        } else if (ts.isExportDeclaration(node)) {
          if (node.isTypeOnly) return node;

          const moduleSpecifier = node.moduleSpecifier;
          if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
            filePath = moduleSpecifier.text;
          }
          const format = getFormat(filePath) || Format.Script;

          exports[filePath] = exports[filePath] ||
            {
              specifiers: [],
              type: DependencyType.Export,
              format,
            };

          const exportClause = node.exportClause;
          if (exportClause) {
            if (ts.isNamespaceExport(exportClause)) {
              // export * as x from "./x.ts"
              exports[filePath].specifiers.push(
                exportClause.name.escapedText as string,
              );
            } else if (ts.isNamedExports(exportClause)) {
              // export { x } from "./x.ts"
              exports[filePath].specifiers.push(
                ...exportClause.elements.map((element) =>
                  element.name.escapedText as string
                ),
              );
            }
          } else {
            // export * from "./x.ts"
            exports[filePath].specifiers.push("*");
          }
          return node;
        } else if (ts.isExportAssignment(node)) {
          // export default "abc"
          exports[filePath] = exports[filePath] ||
            {
              specifiers: [],
              type: DependencyType.Export,
              format: Format.Script,
            };
          exports[filePath].specifiers.push("default");
          return node;
        } else if (ts.isVariableStatement(node)) {
          const combinedModifierFlags = ts.getCombinedModifierFlags(
            node as any,
          );
          if ((combinedModifierFlags & ts.ModifierFlags.Export) !== 0) {
            // export const x = "x"
            exports[filePath] = exports[filePath] ||
              {
                specifiers: [],
                type: DependencyType.Export,
                format: Format.Script,
              };
            node.getChildren(sourceFile).forEach((child) => {
              if (ts.isVariableDeclarationList(child)) {
                child.declarations.forEach((declaration) => {
                  if (ts.isIdentifier(declaration.name)) {
                    exports[filePath].specifiers.push(
                      declaration.name.escapedText as string,
                    );
                  }
                });
              }
            });
          }
        } else if (ts.isFunctionDeclaration(node)) {
          const combinedModifierFlags = ts.getCombinedModifierFlags(node);
          if (
            node.name && (combinedModifierFlags & ts.ModifierFlags.Export) !== 0
          ) {
            exports[filePath] = exports[filePath] ||
              {
                specifiers: [],
                type: DependencyType.Export,
                format: Format.Script,
              };
            if ((combinedModifierFlags & ts.ModifierFlags.Default) !== 0) {
              // export default function x() {}
              exports[filePath].specifiers.push("default");
            } else if (ts.isIdentifier(node.name)) {
              // export function x() {}
              exports[filePath].specifiers.push(
                node.name.escapedText as string,
              );
            }
          }
        } else if (ts.isClassDeclaration(node)) {
          const combinedModifierFlags = ts.getCombinedModifierFlags(node);
          if (
            node.name && (combinedModifierFlags & ts.ModifierFlags.Export) !== 0
          ) {
            exports[filePath] = exports[filePath] ||
              {
                specifiers: [],
                type: DependencyType.Export,
                format: Format.Script,
              };
            if ((combinedModifierFlags & ts.ModifierFlags.Default) !== 0) {
              // export default class X {}
              exports[filePath].specifiers.push("default");
            } else if (ts.isIdentifier(node.name)) {
              // export class X {}
              exports[filePath].specifiers.push(
                node.name.escapedText as string,
              );
            }
          }
        } else if (
          ts.isCallExpression(node) &&
          node.expression.kind === ts.SyntaxKind.ImportKeyword
        ) {
          const argument = node.arguments[0];
          if (ts.isStringLiteral(argument)) {
            // import("./x.ts")
            filePath = argument.text;
            imports[filePath] = imports[filePath] || {
              type: DependencyType.DynamicImport,
              format: Format.Script,
            };
          } else {
            console.warn(
              colors.yellow("Warning"),
              `The argument in dynamic import is not a static string. Cannot resolve '${
                node.getFullText(sourceFile)
              }' in '${sourceFile.fileName}' at position ${node.pos}.`,
            );
          }
        } else if (
          ts.isCallExpression(node) && ts.isIdentifier(node.expression) &&
          node.expression.escapedText === "fetch"
        ) {
          const argument = node.arguments[0];
          if (ts.isStringLiteral(argument)) {
            const filePath = argument.text;
            // if is url, do not add as dependency
            if (!isURL(filePath)) {
              const format = getFormat(filePath) || Format.Unknown;
              imports[filePath] = imports[filePath] ||
                { type: DependencyType.Fetch, format };
            }
          }
        } else if (
          ts.isNewExpression(node) && ts.isIdentifier(node.expression) &&
          node.expression.escapedText === "Worker"
        ) {
          const argument = node.arguments?.[0];
          if (argument && ts.isStringLiteral(argument)) {
            const filePath = argument.text;
            imports[filePath] = imports[filePath] ||
              { type: DependencyType.WebWorker, format: Format.Script };
          }
        } else if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression) &&
          node.expression.name.escapedText === "register" &&
          ts.isPropertyAccessExpression(node.expression.expression) &&
          node.expression.expression.name.escapedText === "serviceWorker"
        ) {
          const argument = node.arguments?.[0];
          if (argument && ts.isStringLiteral(argument)) {
            const filePath = argument.text;
            imports[filePath] = imports[filePath] ||
              { type: DependencyType.ServiceWorker, format: Format.Script };
          }
        }
        return ts.visitEachChild(node, visit, context);
      };
      return visit;
    }
    return (node: ts.Node) => {
      const sourceFile = node.getSourceFile();
      return ts.visitNode(node, createVisitor(sourceFile));
    };
  };
}
