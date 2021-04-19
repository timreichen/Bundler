import { colors, ts } from "../../../deps.ts";
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
  return (context: ts.TransformationContext) => {
    const visitor = (sourceFile: ts.SourceFile): ts.Visitor => {
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
              specifiers: {},
              namespaces: [],
              defaults: [],
              type: DependencyType.Import,
              format,
            } as Dependency;

          if (importClause) {
            if (importClause.namedBindings) {
              if (ts.isNamespaceImport(importClause.namedBindings)) {
                // import * as x from "./x.ts"
                imports[filePath].namespaces.push(
                  importClause.namedBindings.name.text,
                );
              }
              if (ts.isNamedImports(importClause.namedBindings)) {
                // import { x } from "./x.ts"
                importClause.namedBindings.elements.forEach((element) => {
                  // import { x as k } from "./x.ts"
                  const identifier = (element.propertyName?.text ||
                    element.name.text) as string;
                  const name = element.name.text;
                  imports[filePath].specifiers[name] = identifier;
                });
              }
            } else if (importClause.name) {
              // import x from "./x.ts"
              imports[filePath].defaults.push(
                importClause.name.text,
              );
            }
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
              specifiers: {},
              namespaces: [],
              defaults: [],
              type: DependencyType.Export,
              format,
            } as Dependency;

          const exportClause = node.exportClause;
          if (exportClause) {
            if (ts.isNamespaceExport(exportClause)) {
              // export * as x from "./x.ts"
              exports[filePath].namespaces.push(
                exportClause.name.text,
              );
            } else if (ts.isNamedExports(exportClause)) {
              // export { x } from "./x.ts"
              exportClause.elements.forEach((element) => {
                // export { x as y } from "./x.ts"
                const propertyName = (element.propertyName?.text ||
                  element.name.text) as string;
                const name = element.name.text;
                exports[filePath].specifiers[name] = propertyName;
              });
            }
          } else {
            // export * from "./x.ts"
            exports[filePath].namespaces.push(undefined); // has no alias for namespace, therefore undefined as value
          }
          return node;
        } else if (ts.isExportAssignment(node)) {
          // export default "abc"
          exports[filePath] = exports[filePath] ||
            {
              specifiers: {},
              defaults: [],
              namespaces: [],
              type: DependencyType.Export,
              format: Format.Script,
            };
          return node;
        } else if (ts.isVariableStatement(node)) {
          if (
            node.modifiers &&
            hasModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
          ) {
            // export const x = "x"
            exports[filePath] = exports[filePath] ||
              {
                specifiers: {},
                defaults: [],
                namespaces: [],
                type: DependencyType.Export,
                format: Format.Script,
              };
            node.declarationList.declarations.forEach((declaration) => {
              if (ts.isIdentifier(declaration.name)) {
                const propertyName = declaration.name.text;
                const name = declaration.name.text;
                exports[filePath].specifiers[name] = propertyName;
              }
            });
          }
        } else if (ts.isFunctionDeclaration(node)) {
          if (
            node.name &&
            node.modifiers &&
            hasModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
          ) {
            exports[filePath] = exports[filePath] ||
              {
                specifiers: {},
                defaults: [],
                namespaces: [],
                type: DependencyType.Export,
                format: Format.Script,
              };
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
            exports[filePath] = exports[filePath] ||
              {
                specifiers: {},
                defaults: [],
                namespaces: [],
                type: DependencyType.Export,
                format: Format.Script,
              };
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
          node.expression.text === "fetch"
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
          node.expression.text === "Worker"
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
          node.expression.name.text === "register" &&
          ts.isPropertyAccessExpression(node.expression.expression) &&
          node.expression.expression.name.text === "serviceWorker"
        ) {
          const argument = node.arguments?.[0];
          if (argument && ts.isStringLiteral(argument)) {
            const filePath = argument.text;
            imports[filePath] = imports[filePath] ||
              { type: DependencyType.ServiceWorker, format: Format.Script };
          }
        } else if (ts.isEnumDeclaration(node)) {
          if (
            node.modifiers &&
            hasModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
          ) {
            exports[filePath] = exports[filePath] ||
              {
                specifiers: {},
                defaults: [],
                namespaces: [],
                type: DependencyType.Export,
                format: Format.Script,
              };
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
