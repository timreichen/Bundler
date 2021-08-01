import { ts } from "../../../deps.ts";
import { resolve as resolveDependency } from "../../../dependency/dependency.ts";
import { getIdentifier } from "../identifiers/_util.ts";

const { factory } = ts;
/**
 * replace import statements with `await` statement.
 *
 * Example:
 * ```
 * // importIdentifierMap
 * Map {
 *   "./x.ts": "mod"
 * }
 * ```
 * import statement
 * ```ts
 * import { x } from "./x.ts"
 * ```
 * will become
 * ```ts
 * const { x } = await mod
 * ```
 */
export function typescriptTransformImportsExportsTransformer(
  importMap: Deno.ImportMap,
  importIdentifierMap: Map<string, string>,
  identifierMap: Map<string, string>,
) {
  const usedImports: Record<string, Set<string>> = {};

  return (context: ts.TransformationContext) => {
    const visitor = (sourceFile: ts.SourceFile): ts.Visitor => {
      function resolve(filePath: string) {
        return resolveDependency(
          sourceFile.fileName,
          filePath,
          importMap,
        );
      }
      return (node: ts.Node) => {
        if (ts.isImportDeclaration(node)) {
          const importClause = node.importClause;
          if (importClause?.isTypeOnly) return undefined;
          if (ts.isStringLiteral(node.moduleSpecifier)) {
            const resolvedSpecifier = resolve(node.moduleSpecifier.text);

            const identifier = getIdentifier(
              importIdentifierMap,
              resolvedSpecifier,
            );

            if (importClause) {
              if (importClause.namedBindings) {
                if (ts.isNamespaceImport(importClause.namedBindings)) {
                  // import * as x from "./x.ts"
                  const text = importClause.namedBindings.name.text;
                  const name = identifierMap.get(text) || text;
                  return factory.createVariableStatement(
                    undefined,
                    factory.createVariableDeclarationList(
                      [factory.createVariableDeclaration(
                        factory.createIdentifier(name),
                        undefined,
                        undefined,
                        factory.createAwaitExpression(
                          factory.createIdentifier(identifier),
                        ),
                      )],
                      ts.NodeFlags.Const,
                    ),
                  );
                } else if (ts.isNamedImports(importClause.namedBindings)) {
                  // import { x } from "./x.ts"

                  const elements: ts.BindingElement[] = [];
                  importClause.namedBindings.elements.forEach((element) => {
                    let name = element.name.text;
                    const propertyName = element.propertyName?.text;
                    if (identifierMap.has(name)) {
                      name = identifierMap.get(name)!;
                    }

                    const usedImportSpecifiers = usedImports[identifier] =
                      usedImports[identifier] || new Set();
                    if (usedImportSpecifiers.has(name)) return;
                    usedImportSpecifiers.add(name);

                    const newElement = factory.createBindingElement(
                      undefined,
                      propertyName === name ? undefined : propertyName,
                      name,
                      undefined,
                    );

                    elements.push(newElement);
                  });
                  return factory.createVariableStatement(
                    undefined,
                    factory.createVariableDeclarationList(
                      [factory.createVariableDeclaration(
                        factory.createObjectBindingPattern(
                          elements,
                        ),
                        undefined,
                        undefined,
                        factory.createAwaitExpression(
                          factory.createIdentifier(identifier),
                        ),
                      )],
                      ts.NodeFlags.Const,
                    ),
                  );
                }
              }
              if (importClause.name) {
                // import x from "./x.ts"

                return factory.createVariableStatement(
                  undefined,
                  factory.createVariableDeclarationList(
                    [factory.createVariableDeclaration(
                      factory.createIdentifier(importClause.name.text),
                      undefined,
                      undefined,
                      factory.createPropertyAccessExpression(
                        factory.createParenthesizedExpression(
                          factory.createAwaitExpression(
                            factory.createIdentifier(identifier),
                          ),
                        ),
                        factory.createIdentifier("default"),
                      ),
                    )],
                    ts.NodeFlags.Const,
                  ),
                );
              }
            } else {
              // import "./x.ts"

              node = factory.createAwaitExpression(
                factory.createIdentifier(identifier),
              );
            }
          }
          return node;
        } else if (ts.isExportDeclaration(node)) {
          if (node.isTypeOnly) return undefined;
          if (
            node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)
          ) {
            const resolvedSpecifier = resolve(node.moduleSpecifier.text);
            const identifier = getIdentifier(
              importIdentifierMap,
              resolvedSpecifier,
            );

            const exportClause = node.exportClause;
            if (exportClause) {
              if (ts.isNamespaceExport(exportClause)) {
                // export * as x from "./x.ts"
                const text = exportClause.name.text;
                const name = identifierMap.get(text) || text;
                return factory.createVariableStatement(
                  undefined,
                  factory.createVariableDeclarationList(
                    [factory.createVariableDeclaration(
                      factory.createIdentifier(name),
                      undefined,
                      undefined,
                      factory.createAwaitExpression(
                        factory.createIdentifier(identifier),
                      ),
                    )],
                    ts.NodeFlags.Const,
                  ),
                );
              } else if (ts.isNamedExports(exportClause)) {
                // export { x } from "./x.ts"
                const identifier = getIdentifier(
                  importIdentifierMap,
                  resolvedSpecifier,
                );
                const elements: ts.BindingElement[] = [];
                exportClause.elements.forEach((element) => {
                  const text = element.name.text;
                  let name = text;
                  let propertyName = element.propertyName?.text;

                  if (identifierMap.has(text)) {
                    name = identifierMap.get(text)!;
                    propertyName = text;
                  }

                  const usedImportSpecifiers = usedImports[identifier] =
                    usedImports[identifier] || new Set();
                  if (usedImportSpecifiers.has(name)) return;
                  usedImportSpecifiers.add(name);

                  const newElement = factory.createBindingElement(
                    undefined,
                    propertyName === name ? undefined : propertyName,
                    name,
                    undefined,
                  );
                  elements.push(newElement);
                });
                return factory.createVariableStatement(
                  undefined,
                  factory.createVariableDeclarationList(
                    [factory.createVariableDeclaration(
                      factory.createObjectBindingPattern(
                        elements,
                      ),
                      undefined,
                      undefined,
                      factory.createAwaitExpression(
                        factory.createIdentifier(identifier),
                      ),
                    )],
                    ts.NodeFlags.Const,
                  ),
                );
              }
            } else {
              // export * from "./x.ts"
            }
          }
          return undefined;
        }
        return ts.visitEachChild(node, visitor(sourceFile), context);
      };
    };
    return (node: ts.Node) =>
      ts.visitNode(
        node,
        (child: ts.Node) => visitor(node as ts.SourceFile)(child),
      );
  };
}
