import { ts } from "./deps.ts";

const printer: ts.Printer = ts.createPrinter(
  { newLine: ts.NewLineKind.LineFeed, removeComments: false },
);

function bundleImportTransformer(specifier: string) {
  return (context: ts.TransformationContext) => {
    const visit: ts.Visitor = (node: ts.Node) => {
      if (
        ts.isCallExpression(node) &&
        node.expression?.expression?.escapedText === "System" &&
        node.expression?.name?.escapedText === "register"
      ) {
        return ts.visitEachChild(node, (node: ts.Node) => {
          if (node.kind === ts.SyntaxKind["FunctionExpression"]) {
            return ts.visitEachChild(node, (node: ts.Node) => {
              if (node.kind === ts.SyntaxKind["Block"]) {
                return ts.visitEachChild(node, (node: ts.Node) => {
                  if (node.kind === ts.SyntaxKind["ReturnStatement"]) {
                    return ts.visitEachChild(node, (node: ts.Node) => {
                      if (
                        node.kind === ts.SyntaxKind["ObjectLiteralExpression"]
                      ) {
                        return ts.visitEachChild(node, (node: ts.Node) => {
                          if (
                            node.kind === ts.SyntaxKind["PropertyAssignment"]
                          ) {
                            return ts.visitEachChild(node, (node: ts.Node) => {
                              if (
                                node.kind ===
                                  ts.SyntaxKind["FunctionExpression"]
                              ) {
                                return ts.visitEachChild(
                                  node,
                                  (node: ts.Node) => {
                                    if (node.kind === ts.SyntaxKind["Block"]) {
                                      return ts.visitEachChild(
                                        node,
                                        (node: ts.Node) => {
                                          if (
                                            node.kind ===
                                              ts.SyntaxKind[
                                                "ExpressionStatement"
                                              ]
                                          ) {
                                            return ts.visitEachChild(
                                              node,
                                              (node: ts.Node) => {
                                                if (
                                                  node.kind ===
                                                    ts.SyntaxKind[
                                                      "CallExpression"
                                                    ] &&
                                                  node.expression
                                                      .escapedText ===
                                                    "exports_1"
                                                ) {
                                                  return ts.visitEachChild(
                                                    node,
                                                    (node: ts.Node) => {
                                                      if (
                                                        node.kind ===
                                                          ts.SyntaxKind[
                                                            "BinaryExpression"
                                                          ]
                                                      ) {
                                                        return ts.createBinary(
                                                          node.left,
                                                          ts.createToken(
                                                            ts.SyntaxKind
                                                              .EqualsToken,
                                                          ),
                                                          ts.createPropertyAccess(
                                                            ts.createIdentifier(
                                                              specifier,
                                                            ),
                                                            node.right.text,
                                                          ),
                                                        );
                                                      }
                                                      return node;
                                                    },
                                                    context,
                                                  );
                                                }
                                                return node;
                                              },
                                              context,
                                            );
                                          }
                                          return node;
                                        },
                                        context,
                                      );
                                    }
                                    return node;
                                  },
                                  context,
                                );
                              }
                              return node;
                            }, context);
                          }
                          return node;
                        }, context);
                      }
                      return node;
                    }, context);
                  }
                  return node;
                }, context);
              }
              return node;
            }, context);
          }
          return node;
        }, context);
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (node: ts.Node) => {
      return ts.visitNode(node, visit);
    };
  };
}

export function injectBundleImport(source: string, specifier: string): string {
  const sourceFile = ts.createSourceFile(
    "x.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
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
  return printer.printNode(ts.EmitHint.Unspecified, declaration, undefined);
}
