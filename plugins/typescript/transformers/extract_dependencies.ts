import { colors, fs, ts } from "../../../deps.ts";
import { isURL } from "../../../_util.ts";
import {
  Dependencies,
  Dependency,
  DependencyType,
  Format,
  getFormat,
} from "../../plugin.ts";

function hasModifier(
  modifiers: ts.ModifiersArray,
  modifier: ts.SyntaxKind,
) {
  return modifiers.find((moduleSpecifier: ts.Modifier) =>
    moduleSpecifier.kind === modifier
  );
}

/**
 * extracts dependency paths and specifiers, defaults and namespaces
 */
export function typescriptExtractDependenciesTransformer(
  { imports, exports }: Dependencies,
) {
  function addImportEntry(filePath: string, type: DependencyType) {
    imports[filePath] = {
      specifiers: {},
      namespaces: [],
      types: {},
      defaults: [],
      type,
      format: getFormat(filePath) || Format.Script,
    } as Dependency;
  }
  function addExportEntry(filePath: string) {
    exports[filePath] ||= {
      specifiers: {},
      defaults: [],
      namespaces: [],
      types: {},
      type: DependencyType.Export,
      format: Format.Script,
    } as Dependency;
  }

  return (context: ts.TransformationContext) => {
    const visitor = (sourceFile: ts.SourceFile): ts.Visitor => {
      const visit: ts.Visitor = (node: ts.Node) => {
        let filePath = sourceFile.fileName;
        if (ts.isImportDeclaration(node)) {
          const importClause = node.importClause;
          const moduleSpecifier = node.moduleSpecifier;
          const isTypeOnly = importClause?.isTypeOnly;

          if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
            filePath = moduleSpecifier.text;
          }

          addImportEntry(filePath, DependencyType.Import);

          if (importClause) {
            if (importClause.namedBindings) {
              if (ts.isNamespaceImport(importClause.namedBindings)) {
                // import * as x from "./x.ts"
                if (isTypeOnly) {
                  imports[filePath].types["*"] =
                    importClause.namedBindings.name.text;
                } else {
                  imports[filePath].namespaces.push(
                    importClause.namedBindings.name.text,
                  );
                }
              }
              if (ts.isNamedImports(importClause.namedBindings)) {
                // import { x } from "./x.ts"
                importClause.namedBindings.elements.forEach((element) => {
                  // import { x as k } from "./x.ts"
                  const identifier = (element.propertyName?.text ||
                    element.name.text) as string;
                  const name = element.name.text;
                  if (isTypeOnly) {
                    imports[filePath].types[name] = identifier;
                  } else {
                    imports[filePath].specifiers[name] = identifier;
                  }
                });
              }
            } else if (importClause.name) {
              // import x from "./x.ts"
              const name = importClause.name.text;
              if (isTypeOnly) {
                imports[filePath].types[name] = name;
              } else {
                imports[filePath].defaults.push(
                  name,
                );
              }
            }
          }
          return node;
        } else if (ts.isExportDeclaration(node)) {
          // if (node.isTypeOnly) return node;
          const isTypeOnly = node.isTypeOnly;

          const moduleSpecifier = node.moduleSpecifier;
          if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
            filePath = moduleSpecifier.text;
          }

          addExportEntry(filePath);

          const exportClause = node.exportClause;
          if (exportClause) {
            if (ts.isNamespaceExport(exportClause)) {
              // export * as x from "./x.ts"
              const name = exportClause.name.text;
              if (isTypeOnly) {
                exports[filePath].types["*"] = name;
              } else {
                exports[filePath].namespaces.push(
                  name,
                );
              }
            } else if (ts.isNamedExports(exportClause)) {
              // export { x } from "./x.ts"
              exportClause.elements.forEach((element) => {
                // export { x as y } from "./x.ts"
                const propertyName = (element.propertyName?.text ||
                  element.name.text) as string;
                const name = element.name.text;
                if (isTypeOnly) {
                  exports[filePath].types[name] = propertyName;
                } else {
                  exports[filePath].specifiers[name] = propertyName;
                }
              });
            }
          } else {
            // export * from "./x.ts"
            if (isTypeOnly) {
            } else {
              exports[filePath].namespaces.push(undefined); // has no alias for namespace, therefore undefined as value
            }
          }
          return node;
        } else if (ts.isExportAssignment(node)) {
          // export default "abc"
          addExportEntry(filePath);
          return node;
        } else if (ts.isVariableStatement(node)) {
          if (
            node.modifiers &&
            hasModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
          ) {
            // export const x = "x"
            addExportEntry(filePath);

            node.declarationList.declarations.forEach((declaration) => {
              if (ts.isIdentifier(declaration.name)) {
                const propertyName = declaration.name.text;
                const name = declaration.name.text;
                exports[filePath].specifiers[name] = propertyName;
              } else if (ts.isObjectBindingPattern(declaration.name)) {
                declaration.name.elements.forEach((element) => {
                  if (ts.isIdentifier(element.name)) {
                    const propertyName = (element.propertyName &&
                        ts.isIdentifier(element.propertyName) &&
                        (element.propertyName?.text) ||
                      element.name.text) as string;
                    const name = element.name.text;
                    exports[filePath].specifiers[name] = propertyName;
                  }
                });
              }
            });
          }
        } else if (ts.isFunctionDeclaration(node)) {
          if (
            node.name &&
            node.modifiers &&
            hasModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
          ) {
            addExportEntry(filePath);

            if (
              hasModifier(node.modifiers, ts.SyntaxKind.DefaultKeyword)
            ) {
              // export default function x() {}
              exports[filePath].defaults.push(node.name.text);
            } else if (ts.isIdentifier(node.name)) {
              // export function x() {}
              const identifier = node.name.text;
              const name = node.name.text;
              exports[filePath].specifiers[name] = identifier;
            }
          }
        } else if (ts.isClassDeclaration(node)) {
          if (
            node.name &&
            node.modifiers &&
            hasModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
          ) {
            addExportEntry(filePath);

            if (
              hasModifier(node.modifiers, ts.SyntaxKind.DefaultKeyword)
            ) {
              // export default class X {}
              exports[filePath].defaults.push(node.name.text);
            } else if (ts.isIdentifier(node.name)) {
              // export class X {}
              const propertyName = node.name.text;
              const name = node.name.text;
              exports[filePath].specifiers[name] = propertyName;
            }
          }
        } else if (ts.isInterfaceDeclaration(node)) {
          if (
            node.modifiers &&
            hasModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
          ) {
            addExportEntry(filePath);

            // export interface x {}
            const name = node.name.text;

            exports[filePath].types[name] = name;
          }
        } else if (ts.isTypeAliasDeclaration(node)) {
          if (
            node.modifiers &&
            hasModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
          ) {
            addExportEntry(filePath);

            // export interface x {}
            const name = node.name.text;
            exports[filePath].types[name] = name;
          }
        } else if (
          ts.isCallExpression(node) &&
          node.expression.kind === ts.SyntaxKind.ImportKeyword
        ) {
          const argument = node.arguments[0];
          if (ts.isStringLiteral(argument)) {
            // import("./x.ts")
            filePath = argument.text;

            addImportEntry(filePath, DependencyType.DynamicImport);
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
          node.expression.text === "fetch"
        ) {
          const argument = node.arguments[0];
          if (ts.isStringLiteral(argument)) {
            const filePath = argument.text;

            // if is url, do not add as dependency
            if (!isURL(filePath) && fs.existsSync(filePath)) {
              addImportEntry(filePath, DependencyType.Fetch);
            }
          }
        } else if (
          ts.isNewExpression(node) && ts.isIdentifier(node.expression) &&
          node.expression.text === "Worker"
        ) {
          const argument = node.arguments?.[0];
          if (argument && ts.isStringLiteral(argument)) {
            const filePath = argument.text;

            addImportEntry(filePath, DependencyType.WebWorker);
          }
        } else if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression) &&
          node.expression.name.text === "register" &&
          ts.isPropertyAccessExpression(node.expression.expression) &&
          node.expression.expression.name.text === "serviceWorker"
        ) {
          const argument = node.arguments?.[0];
          if (argument && ts.isStringLiteral(argument)) {
            const filePath = argument.text;

            addImportEntry(filePath, DependencyType.ServiceWorker);
          }
        } else if (ts.isEnumDeclaration(node)) {
          if (
            node.modifiers &&
            hasModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
          ) {
            addExportEntry(filePath);
            // export enum x {}
            const identifier = node.name.text;
            const name = node.name.text;
            exports[filePath].specifiers[name] = identifier;
          }
        }
        return ts.visitEachChild(node, visit, context);
      };
      return visit;
    };
    return (node: ts.Node) => {
      const sourceFile = node.getSourceFile();
      return ts.visitNode(node, visitor(sourceFile));
    };
  };
}
