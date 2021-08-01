import { colors, fs, path, ts } from "../../../deps.ts";
import { isURL } from "../../../_util.ts";
import { DependencyType, ModuleData } from "../../plugin.ts";
import type { Import } from "../../plugin.ts";

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
  moduleData: ModuleData,
) {
  function addImport(filePath: string, type: DependencyType): Import {
    const imports = moduleData.dependencies[filePath] ||= {};
    return imports[type] ||= {};
  }

  return (context: ts.TransformationContext) => {
    const visitor = (sourceFile: ts.SourceFile): ts.Visitor => {
      const visit: ts.Visitor = (node: ts.Node) => {
        let filePath = sourceFile.fileName;
        if (ts.isImportDeclaration(node)) {
          const importClause = node.importClause;
          const moduleSpecifier = node.moduleSpecifier;
          const isTypeOnly = importClause?.isTypeOnly;

          if (isTypeOnly) {
            return undefined;
          }

          if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
            filePath = moduleSpecifier.text;
          }

          const entry = addImport(filePath, DependencyType.Import);

          if (importClause) {
            if (importClause.namedBindings) {
              if (ts.isNamespaceImport(importClause.namedBindings)) {
                // import * as x from "./x.ts"
                entry.namespaces ||= [];
                entry.namespaces.push(
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
                  entry.specifiers ||= {};
                  entry.specifiers[name] = identifier;
                });
              }
            } else if (importClause.name) {
              // import x from "./x.ts"
              const name = importClause.name.text;
              entry.defaults ||= [];
              entry.defaults.push(
                name,
              );
            }
          }
          return node;
        } else if (ts.isExportDeclaration(node)) {
          const isTypeOnly = node.isTypeOnly;

          if (isTypeOnly) {
            return undefined;
          }

          const moduleSpecifier = node.moduleSpecifier;
          if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
            filePath = moduleSpecifier.text;
          }
          const passthrough = moduleSpecifier &&
            filePath !== sourceFile.fileName;

          const entry = passthrough
            ? addImport(filePath, DependencyType.Import)
            : moduleData.export; // basically imports and re-exports again

          const exportClause = node.exportClause;
          if (exportClause) {
            if (ts.isNamespaceExport(exportClause)) {
              // export * as x from "./x.ts"
              const name = exportClause.name.text;
              entry.namespaces ||= [];
              entry.namespaces.push(name);
              moduleData.export.specifiers ||= {};
              moduleData.export.specifiers[name] = name;
            } else if (ts.isNamedExports(exportClause)) {
              exportClause.elements.forEach((element) => {
                const propertyName = (element.propertyName?.text ||
                  element.name.text) as string;
                const name = element.name.text;
                // export { x } from "./x.ts" or export { x as y } from "./x.ts"
                entry.specifiers ||= {};
                entry.specifiers[name] = propertyName;
                moduleData.export.specifiers ||= {};
                moduleData.export.specifiers[name] = passthrough
                  ? name
                  : propertyName;
              });
            }
          } else {
            // export * from "./x.ts"
            entry.namespaces ||= [];
            entry.namespaces.push("*"); // has no alias for namespace, therefore undefined as value
            moduleData.export.namespaces ||= [];
            moduleData.export.namespaces.push(filePath);
          }
          return node;
        } else if (ts.isExportAssignment(node)) {
          // export default "abc"
          const entry = moduleData.export;
          if (ts.isIdentifier(node.expression)) {
            entry.default = node.expression.text;
          } else {
            entry.default = true;
          }
          return node;
        } else if (ts.isVariableStatement(node)) {
          if (
            node.modifiers &&
            hasModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
          ) {
            // export const x = "x"
            const entry = moduleData.export;

            node.declarationList.declarations.forEach((declaration) => {
              if (ts.isIdentifier(declaration.name)) {
                const propertyName = declaration.name.text;
                const name = declaration.name.text;
                entry.specifiers ||= {};
                entry.specifiers[name] = propertyName;
              } else if (ts.isObjectBindingPattern(declaration.name)) {
                declaration.name.elements.forEach((element) => {
                  if (ts.isIdentifier(element.name)) {
                    const propertyName = (element.propertyName &&
                        ts.isIdentifier(element.propertyName) &&
                        (element.propertyName?.text) ||
                      element.name.text) as string;
                    const name = element.name.text;
                    entry.specifiers ||= {};
                    entry.specifiers[name] = propertyName;
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
            const _export = moduleData.export;

            if (
              hasModifier(node.modifiers, ts.SyntaxKind.DefaultKeyword)
            ) {
              // export default function x() {}
              _export.default = node.name.text;
            } else if (ts.isIdentifier(node.name)) {
              // export function x() {}
              const identifier = node.name.text;
              const name = node.name.text;
              _export.specifiers ||= {};
              _export.specifiers[name] = identifier;
            }
          }
        } else if (ts.isClassDeclaration(node)) {
          if (
            node.name &&
            node.modifiers &&
            hasModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
          ) {
            const entry = moduleData.export;

            if (
              hasModifier(node.modifiers, ts.SyntaxKind.DefaultKeyword)
            ) {
              // export default class X {}
              entry.default = node.name.text;
            } else if (ts.isIdentifier(node.name)) {
              // export class X {}
              const propertyName = node.name.text;
              const name = node.name.text;
              entry.specifiers ||= {};
              entry.specifiers[name] = propertyName;
            }
          }
        } else if (ts.isInterfaceDeclaration(node)) {
          if (
            node.modifiers &&
            hasModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
          ) {
            const entry = moduleData.export;

            // export interface x {}
            const name = node.name.text;

            entry.types ||= {};
            entry.types[name] = name;
          }
        } else if (ts.isTypeAliasDeclaration(node)) {
          if (
            node.modifiers &&
            hasModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
          ) {
            const entry = moduleData.export;
            // export interface x {}
            const name = node.name.text;
            entry.types ||= {};
            entry.types[name] = name;
          }
        } else if (
          ts.isCallExpression(node) &&
          node.expression.kind === ts.SyntaxKind.ImportKeyword
        ) {
          const argument = node.arguments[0];
          if (ts.isStringLiteral(argument)) {
            // import("./x.ts")
            filePath = argument.text;
            addImport(filePath, DependencyType.DynamicImport);
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

            // if is external file, do not add as dependency
            if (
              !isURL(filePath) &&
              fs.existsSync(
                path.join(path.dirname(sourceFile.fileName), filePath),
              )
            ) {
              addImport(filePath, DependencyType.Fetch);
            }
          }
        } else if (
          ts.isNewExpression(node) && ts.isIdentifier(node.expression) &&
          node.expression.text === "Worker"
        ) {
          const argument = node.arguments?.[0];
          if (argument && ts.isStringLiteral(argument)) {
            const filePath = argument.text;

            addImport(filePath, DependencyType.WebWorker);
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

            addImport(filePath, DependencyType.ServiceWorker);
          }
        } else if (ts.isEnumDeclaration(node)) {
          if (
            node.modifiers &&
            hasModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
          ) {
            const entry = moduleData.export;
            // export enum x {}
            const identifier = node.name.text;
            const name = node.name.text;
            entry.specifiers ||= {};
            entry.specifiers[name] = identifier;
          }
        }
        return ts.visitEachChild(node, visit, context);
      };
      return visit;
    };
    return (node: ts.Node) => {
      return ts.visitNode(node, visitor(node as ts.SourceFile));
    };
  };
}

export function extractDependenciesFromSourceFile(
  sourceFile: ts.SourceFile,
  compilerOptions?: ts.CompilerOptions,
) {
  const moduleData: ModuleData = {
    dependencies: {},
    export: {},
  };
  ts.transform(
    sourceFile,
    [typescriptExtractDependenciesTransformer(moduleData)],
    compilerOptions,
  );
  return moduleData;
}

export function extractDependencies(
  fileName: string,
  sourceText: string,
  compilerOptions?: ts.CompilerOptions,
) {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
  );
  return extractDependenciesFromSourceFile(sourceFile, compilerOptions);
}
