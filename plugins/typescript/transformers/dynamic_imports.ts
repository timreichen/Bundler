import { ts } from "../../../deps.ts";

/**
 * append `.then(async (mod) => await mod.default)` on dynamic `import()` statements
 * Example
 * ```ts
 * import(…)
 * ```
 * becomes
 * ```ts
 * import(…).then(async (mod) => await mod.default)
 * ```
 */
export function typescriptTransformDynamicImportTransformer() {
  return (context: ts.TransformationContext) => {
    const visitor = (sourceFile: ts.SourceFile): ts.Visitor =>
      (node: ts.Node) => {
        if (
          ts.isCallExpression(node) &&
          node.expression.kind === ts.SyntaxKind.ImportKeyword
        ) {
          const argument = node.arguments[0];
          if (ts.isStringLiteral(argument)) {
            // import("./x.ts")
            return ts.factory.createCallExpression(
              ts.factory.createPropertyAccessExpression(
                node,
                ts.factory.createIdentifier("then"),
              ),
              undefined,
              [ts.factory.createArrowFunction(
                [ts.factory.createModifier(ts.SyntaxKind.AsyncKeyword)],
                undefined,
                [ts.factory.createParameterDeclaration(
                  undefined,
                  undefined,
                  undefined,
                  ts.factory.createIdentifier("mod"),
                  undefined,
                  undefined,
                  undefined,
                )],
                undefined,
                ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                ts.factory.createAwaitExpression(
                  ts.factory.createPropertyAccessExpression(
                    ts.factory.createIdentifier("mod"),
                    ts.factory.createIdentifier("default"),
                  ),
                ),
              )],
            );
          }
        }
        return ts.visitEachChild(node, visitor(sourceFile), context);
      };
    return (node: ts.Node) =>
      ts.visitNode(
        node,
        (child: ts.Node) => visitor(node as ts.SourceFile)(child),
      );
  };
}
