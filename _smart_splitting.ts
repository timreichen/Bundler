import { xts } from "./deps.ts";

const printer: xts.Printer = xts.createPrinter(
  { newLine: xts.NewLineKind.LineFeed, removeComments: false },
);

function bundleImportTransformer(specifier: string) {
  return (context: xts.TransformationContext) => {
    const visit: xts.Visitor = (node: xts.Node) => {
      if (
        xts.isCallExpression(node) &&
        node.expression?.expression?.escapedText === "System" &&
        node.expression?.name?.escapedText === "register"
      ) {
        return xts.visitEachChild(node, (node: xts.Node) => {
          if (node.kind === xts.SyntaxKind["FunctionExpression"]) {
            return xts.visitEachChild(node, (node: xts.Node) => {
              if (node.kind === xts.SyntaxKind["Block"]) {
                return xts.visitEachChild(node, (node: xts.Node) => {
                  if (node.kind === xts.SyntaxKind["ReturnStatement"]) {
                    return xts.visitEachChild(node, (node: xts.Node) => {
                      if (
                        node.kind === xts.SyntaxKind["ObjectLiteralExpression"]
                      ) {
                        return xts.visitEachChild(node, (node: xts.Node) => {
                          if (
                            node.kind === xts.SyntaxKind["PropertyAssignment"]
                          ) {
                            return xts.visitEachChild(node, (node: xts.Node) => {
                              if (
                                node.kind ===
                                  xts.SyntaxKind["FunctionExpression"]
                              ) {
                                return xts.visitEachChild(
                                  node,
                                  (node: xts.Node) => {
                                    if (node.kind === xts.SyntaxKind["Block"]) {
                                      return xts.visitEachChild(
                                        node,
                                        (node: xts.Node) => {
                                          if (
                                            node.kind ===
                                              xts.SyntaxKind[
                                                "ExpressionStatement"
                                              ]
                                          ) {
                                            return xts.visitEachChild(
                                              node,
                                              (node: xts.Node) => {
                                                if (
                                                  node.kind ===
                                                    xts.SyntaxKind[
                                                      "CallExpression"
                                                    ] &&
                                                  node.expression
                                                      .escapedText ===
                                                    "exports_1"
                                                ) {
                                                  return xts.visitEachChild(
                                                    node,
                                                    (node: xts.Node) => {
                                                      if (
                                                        node.kind ===
                                                          xts.SyntaxKind[
                                                            "BinaryExpression"
                                                          ]
                                                      ) {
                                                        return xts.createBinary(
                                                          node.left,
                                                          xts.createToken(
                                                            xts.SyntaxKind
                                                              .EqualsToken,
                                                          ),
                                                          xts.createPropertyAccess(
                                                            xts.createIdentifier(
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
      return xts.visitEachChild(node, visit, context);
    };
    return (node: xts.Node) => {
      return xts.visitNode(node, visit);
    };
  };
}

export function injectBundleImport(source: string, specifier: string): string {
  const sourceFile = xts.createSourceFile(
    "x.ts",
    source,
    xts.ScriptTarget.Latest,
    true,
  );
  const result = xts.transform(sourceFile, [bundleImportTransformer(specifier)]);
  return printer.printNode(
    xts.EmitHint.SourceFile,
    result.transformed[0],
    sourceFile,
  );
}

export function createModuleImport(
  specifier: string,
  filePath: string,
): string {
  const declaration = xts.createImportDeclaration(
    undefined,
    undefined,
    xts.createImportClause(
      undefined,
      xts.createNamespaceImport(xts.createIdentifier(specifier)),
      false,
    ),
    xts.createStringLiteral(filePath),
  );
  return printer.printNode(xts.EmitHint.Unspecified, declaration, undefined);
}
