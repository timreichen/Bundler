import { colors, ImportMap, path, resolveWithImportMap, ts } from "./deps.ts";

import { ensureExtension, isURL } from "./_util.ts";

export function resolve(
  filePath: string,
  dependencyPath: string,
  importMap: ImportMap = { imports: {}, scopes: {} },
) {
  const resolvedImportPath = resolveWithImportMap(
    dependencyPath,
    importMap,
    filePath,
  );

  const isUrl = isURL(resolvedImportPath);
  const parentIsUrl = isURL(filePath);

  let resolvedPath: string;
  if (isUrl) {
    resolvedPath = resolvedImportPath;
  } else if (
    path.isAbsolute(resolvedImportPath) || dependencyPath !== resolvedImportPath
  ) {
    if (parentIsUrl) {
      const fileUrl = new URL(filePath);
      fileUrl.pathname = resolvedImportPath;
      resolvedPath = fileUrl.href;
    } else {
      resolvedPath = resolvedImportPath;
    }
  } else {
    if (dependencyPath === ".") {
      resolvedPath = resolveWithImportMap(filePath, importMap);
    } else if (parentIsUrl) {
      const fileUrl = new URL(filePath);
      fileUrl.pathname = path.posix.join(path.dirname(fileUrl.pathname));
      resolvedPath = fileUrl.href;
    } else {
      resolvedPath = path.join(path.dirname(filePath), resolvedImportPath);
    }
  }

  return ensureExtension(resolvedPath, ".ts");
}

export type Type =
  | "html"
  | "script"
  | "style"
  | "image"
  | "webmanifest"
  | "webworker"
  | "serviceworker";
export interface Imports {
  [filePath: string]: {
    specifiers: string[];
    dynamic?: true;
    type: Type;
  };
}
export interface Exports {
  [filePath: string]: { specifiers: string[] };
}
export interface Dependencies {
  imports: Imports;
  exports: Exports;
}

export function getDependenciesTypescriptTransformer(
  { imports, exports }: { imports: Imports; exports: Exports },
) {
  return (context: ts.TransformationContext) => {
    function createVisitor(sourceFile: ts.SourceFile): ts.Visitor {
      const visit: ts.Visitor = (node: ts.Node) => {
        let filePath = ".";

        if (ts.isImportDeclaration(node)) {
          const importClause = node.importClause;
          if (importClause?.isTypeOnly) return node;

          if (node.moduleSpecifier) {
            const quotedSpecifier = node.moduleSpecifier.getText(sourceFile);
            const unquotedSpecifier = quotedSpecifier.substring(
              1,
              quotedSpecifier.length - 1,
            );
            filePath = unquotedSpecifier;
          }
          imports[filePath] = imports[filePath] || { specifiers: [] };
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
                    element.name.escapedText as string
                  ),
                );
              }
            });
          } else {
            // import from "./x.ts"
            // if (ts.isImportEqualsDeclaration(node)) {
            // }
          }
          return node;
        } else if (ts.isExportDeclaration(node)) {
          if (node.isTypeOnly) return node;

          if (node.moduleSpecifier) {
            const quotedSpecifier = node.moduleSpecifier.getText(sourceFile);
            const unquotedSpecifier = quotedSpecifier.substring(
              1,
              quotedSpecifier.length - 1,
            );
            filePath = unquotedSpecifier;
          }

          exports[filePath] = exports[filePath] || { specifiers: [] };

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
          exports[filePath] = exports[filePath] || { specifiers: [] };
          exports[filePath].specifiers.push("default");
          return node;
        } else if (ts.isVariableStatement(node)) {
          const combinedModifierFlags = ts.getCombinedModifierFlags(
            node as any,
          );
          if ((combinedModifierFlags & ts.ModifierFlags.Export) !== 0) {
            // export const x = "x"
            exports[filePath] = exports[filePath] || { specifiers: [] };
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
            exports[filePath] = exports[filePath] || { specifiers: [] };
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
            exports[filePath] = exports[filePath] || { specifiers: [] };
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
            imports[filePath] = imports[filePath] || {};
            imports[filePath].dynamic = true;
          } else {
            console.warn(
              colors.yellow("Warning"),
              `The argument in dynamic import is not a static string. Cannot resolve ${
                node.getFullText(sourceFile)
              } at position ${node.pos}.`,
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
              imports[filePath] = imports[filePath] || {};
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
              { type: "webworker" };
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
              { type: "serviceworker" };
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

export function getDependencies(
  filePath: string,
  source: string,
  { compilerOptions = {} }: {
    compilerOptions?: ts.CompilerOptions;
  } = {},
): Dependencies {
  const imports: Imports = {};
  const exports: Exports = {};

  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
  );
  ts.transform(
    sourceFile,
    [getDependenciesTypescriptTransformer({ imports, exports })],
    compilerOptions,
  );

  return {
    imports,
    exports,
  };
}
