import { ts } from "../../../deps.ts";

/**
 * inject ```.then(async (data) => await data.default)` to load module async iife
 * @returns 
 */
export function typescriptTransformDynamicImportTransformer(): ts.TransformerFactory<
  ts.SourceFile
> {
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
                  ts.factory.createIdentifier("data"),
                  undefined,
                  undefined,
                  undefined,
                )],
                undefined,
                ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                ts.factory.createAwaitExpression(
                  ts.factory.createPropertyAccessExpression(
                    ts.factory.createIdentifier("data"),
                    ts.factory.createIdentifier("default"),
                  ),
                ),
              )],
            );
          }
        }
        return ts.visitEachChild(node, visitor(sourceFile), context);
      };
    return (node: ts.SourceFile) =>
      ts.visitNode(node, (child: ts.Node) => visitor(node)(child));
  };
}
