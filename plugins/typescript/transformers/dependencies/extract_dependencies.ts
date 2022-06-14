import {
  ImportMap,
  resolveModuleSpecifier as resolveImportMapModuleSpecifier,
  ts,
} from "../../../../deps.ts";
import {
  Dependency,
  DependencyData,
  DependencyFormat,
  DependencyType,
} from "../../../plugin.ts";
import { hasModifier, resolveModuleSpecifier } from "../../../_util.ts";
import { getDepdendencyFormatFromAssertType } from "./_util.ts";

export function extractDependenciesTransformer(
  { dependencies, exports }: DependencyData,
  { importMap }: {
    importMap?: ImportMap;
  } = {},
): ts.TransformerFactory<
  ts.SourceFile
> {
  return (context: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile) => {
      function resolveSpecifier(
        filePath: string,
        moduleSpecifier: string,
        importMap?: ImportMap,
      ) {
        return importMap
          ? resolveImportMapModuleSpecifier(
            moduleSpecifier,
            importMap,
            new URL(filePath, "file://"),
          )
          : resolveModuleSpecifier(filePath, moduleSpecifier);
      }

      const visitor: ts.Visitor = (node: ts.Node) => {
        if (
          ts.isImportDeclaration(node) &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          const moduleSpecifier = node.moduleSpecifier.text;
          const resolvedModuleSpecifier = resolveSpecifier(
            sourceFile.fileName,
            moduleSpecifier,
            importMap,
          );

          const typeName = (node.assertClause?.elements.find((element) =>
            element.name.text === "type"
          )?.value as ts.StringLiteral)?.text;

          const format = typeName
            ? getDepdendencyFormatFromAssertType(typeName)
            : DependencyFormat.Script;

          const importClause = node.importClause;

          const dependency: Dependency = {
            input: resolvedModuleSpecifier,
            type: DependencyType.ImportExport,
            format,
          };

          if (
            importClause
          ) {
            const namedBindings = importClause.namedBindings;
            if (
              namedBindings
            ) {
              if (
                ts.isNamedImports(namedBindings)
              ) {
                if (
                  importClause.isTypeOnly
                ) {
                  // import type { x } from "./x.ts"
                  for (const element of namedBindings.elements) {
                    dependency.types ||= {};
                    dependency.types[
                      element.name.text
                    ] = element.propertyName?.text || element.name.text;
                  }
                } else {
                  // import { x } from "./x.ts"
                  for (const element of namedBindings.elements) {
                    dependency.specifiers ||= {};
                    dependency.specifiers[
                      element.name.text
                    ] = element.propertyName?.text || element.name.text;
                  }
                }
              } else if (
                ts.isNamespaceImport(namedBindings)
              ) {
                // import * as x from "./x.ts"
                dependency.namespaces ||= [];
                dependency.namespaces.push(
                  namedBindings.name.text,
                );
              }
            }
            if (
              importClause.name &&
              ts.isIdentifier(importClause.name)
            ) {
              // import x from "./x.ts"
              const name = importClause.name.text;
              dependency.default = name;
            }
          }

          dependencies.push(dependency);
        } else if (
          ts.isExportDeclaration(node)
        ) {
          if (
            node.moduleSpecifier &&
            ts.isStringLiteral(node.moduleSpecifier)
          ) {
            const moduleSpecifier = node.moduleSpecifier.text;
            const typeName = (node.assertClause?.elements.find((element) =>
              element.name.text === "type"
            )?.value as ts.StringLiteral)?.text;

            const format = typeName
              ? getDepdendencyFormatFromAssertType(typeName)
              : DependencyFormat.Script;

            const resolvedModuleSpecifier = resolveSpecifier(
              sourceFile.fileName,
              moduleSpecifier,
              importMap,
            );

            const dependency: Dependency = {
              input: resolvedModuleSpecifier,
              type: DependencyType.ImportExport,
              format,
            };
            const exportClause = node.exportClause;
            if (
              exportClause
            ) {
              if (
                ts.isNamespaceExport(exportClause)
              ) {
                // export * as x from "./x.ts"
                dependency.namespaces ||= [];
                dependency.namespaces.push(exportClause.name.text);
              } else if (
                ts.isNamedExports(exportClause)
              ) {
                // export { x } from "./x.ts"
                const entries = exportClause.elements.map((element) => [
                  element.name.text,
                  element.propertyName?.text || element.name.text,
                ]);
                if (
                  node.isTypeOnly
                ) {
                  dependency.types = Object.fromEntries(entries);
                } else {
                  dependency.specifiers = Object.fromEntries(entries);
                }
              }
            } else {
              // export * from "./x.ts"
              dependency.namespaces ||= [];
              dependency.namespaces.push("*");
            }
            dependencies.push(dependency);
          } else if (
            node.exportClause && ts.isNamedExports(node.exportClause)
          ) {
            const entries = node.exportClause.elements.map((element) => [
              element.name.text,
              element.propertyName?.text || element.name.text,
            ]);
            const specifiers = Object.fromEntries(entries);
            const _default = specifiers["default"];
            if (_default) {
              exports.default = _default;
              delete specifiers["default"];
            }
            if (Object.keys(specifiers).length) {
              exports.specifiers ||= {};
              Object.assign(exports.specifiers, specifiers);
            }
          }
        } else if (
          ts.isCallExpression(node)
        ) {
          if (
            ts.isIdentifier(node.expression) &&
            node.expression.text === "fetch" &&
            ts.isStringLiteral(node.arguments?.[0])
          ) {
            const moduleSpecifier = node.arguments[0].text;
            const resolvedModuleSpecifier = resolveSpecifier(
              sourceFile.fileName,
              moduleSpecifier,
              importMap,
            );
            dependencies.push({
              input: resolvedModuleSpecifier,
              type: DependencyType.Fetch,
              format: DependencyFormat.Script,
            });
          } else if (
            node.expression.kind === ts.SyntaxKind.ImportKeyword &&
            ts.isStringLiteral(node.arguments?.[0])
          ) {
            const moduleSpecifier = node.arguments?.[0].text;
            let format = DependencyFormat.Script;
            const assertion = node.arguments[1];
            if (assertion && ts.isObjectLiteralExpression(assertion)) {
              const assertProperty = assertion.properties.find((property) =>
                property.name && ts.isIdentifier(property.name) &&
                property.name.text === "assert"
              );
              if (assertProperty && ts.isPropertyAssignment(assertProperty)) {
                if (ts.isObjectLiteralExpression(assertProperty.initializer)) {
                  const typeProperty = assertProperty.initializer.properties
                    .find((property) =>
                      property.name && ts.isIdentifier(property.name) &&
                      property.name.text === "type"
                    );
                  if (typeProperty && ts.isPropertyAssignment(typeProperty)) {
                    if (ts.isStringLiteral(typeProperty.initializer)) {
                      const typeName = typeProperty.initializer.text;
                      format = getDepdendencyFormatFromAssertType(typeName);
                    }
                  }
                }
              }
            }
            const resolvedModuleSpecifier = resolveSpecifier(
              sourceFile.fileName,
              moduleSpecifier,
              importMap,
            );
            dependencies.push({
              input: resolvedModuleSpecifier,
              type: DependencyType.DynamicImport,
              format,
            });
          } else if (
            ts.isPropertyAccessExpression(node.expression) &&
            node.expression.name.text === "register" &&
            ts.isPropertyAccessExpression(node.expression.expression) &&
            node.expression.expression.name.text === "serviceWorker"
          ) {
            const argument = node.arguments?.[0];
            if (argument && ts.isStringLiteral(argument)) {
              const moduleSpecifier = argument.text;
              const resolvedModuleSpecifier = resolveSpecifier(
                sourceFile.fileName,
                moduleSpecifier,
                importMap,
              );
              dependencies.push({
                input: resolvedModuleSpecifier,
                format: DependencyFormat.Script,
                type: DependencyType.ServiceWorker,
              });
            }
          }
        } else if (
          ts.isNewExpression(node) && ts.isIdentifier(node.expression) &&
          node.expression.text === "Worker"
        ) {
          const argument = node.arguments?.[0];
          if (argument && ts.isStringLiteral(argument)) {
            const moduleSpecifier = argument.text;
            const resolvedModuleSpecifier = resolveSpecifier(
              sourceFile.fileName,
              moduleSpecifier,
              importMap,
            );
            dependencies.push({
              input: resolvedModuleSpecifier,
              type: DependencyType.WebWorker,
              format: DependencyFormat.Script,
            });
          }
        } else if (ts.isExportAssignment(node)) {
          // export default "abc"
          if (ts.isIdentifier(node.expression)) {
            exports.default = node.expression.text;
          } else {
            exports.default = true;
          }
        } else if (
          node.modifiers &&
          hasModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
        ) {
          if (ts.isVariableStatement(node)) {
            for (const declaration of node.declarationList.declarations) {
              if (ts.isIdentifier(declaration.name)) {
                exports.specifiers ||= {};
                exports.specifiers[declaration.name.text] =
                  declaration.name.text;
              } else if (ts.isObjectBindingPattern(declaration.name)) {
                for (const element of declaration.name.elements) {
                  if (ts.isIdentifier(element.name)) {
                    const name = element.name.text;
                    const propertyName = element.propertyName &&
                        ts.isIdentifier(element.propertyName) &&
                        element.propertyName.text || name;
                    exports.specifiers ||= {};
                    exports.specifiers[name] = propertyName;
                  }
                }
              }
            }
          } else if (ts.isFunctionDeclaration(node) && node.name) {
            if (hasModifier(node.modifiers, ts.SyntaxKind.DefaultKeyword)) {
              // export default function x() {}
              exports.default = node.name.text;
            } else {
              // export function x() {}
              exports.specifiers ||= {};
              exports.specifiers[node.name.text] = node.name.text;
            }
          } else if (ts.isClassDeclaration(node) && node.name) {
            if (hasModifier(node.modifiers, ts.SyntaxKind.DefaultKeyword)) {
              // export default class X {}
              exports.default = node.name.text;
            } else {
              // export class X {}
              exports.specifiers ||= {};
              exports.specifiers[node.name.text] = node.name.text;
            }
          } else if (ts.isInterfaceDeclaration(node)) {
            // export interface x {}
            const name = node.name.text;
            exports.types ||= {};
            exports.types[name] = name;
          } else if (ts.isTypeAliasDeclaration(node)) {
            // export interface x {}
            const name = node.name.text;
            exports.types ||= {};
            exports.types[name] = name;
          } else if (ts.isEnumDeclaration(node)) {
            // export enum x {}
            const identifier = node.name.text;
            const name = node.name.text;
            exports.specifiers ||= {};
            exports.specifiers[name] = identifier;
          }
        }
        return ts.visitEachChild(node, visitor, context);
      };
      return ts.visitNode(sourceFile, visitor);
    };
  };
}

export function extractDependenciesFromSourceFile(
  sourceFile: ts.SourceFile,
  compilerOptions: ts.CompilerOptions,
  { importMap }: {
    importMap?: ImportMap;
  } = {},
) {
  const data: DependencyData = { dependencies: [], exports: {} };
  ts.transform(
    sourceFile,
    [extractDependenciesTransformer(data, { importMap })],
    compilerOptions,
  );
  return data;
}

export function extractDependencies(
  fileName: string,
  sourceText: string,
  compilerOptions: ts.CompilerOptions,
  { importMap }: { importMap?: ImportMap } = {},
) {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.ESNext,
  );
  return extractDependenciesFromSourceFile(
    sourceFile,
    compilerOptions,
    { importMap },
  );
}
