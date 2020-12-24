import { ts } from "../../../deps.ts";

export function typescriptInjectInstantiateNameTransformer(
  instantiateName: string,
): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => {
    const visit: ts.Visitor = (node: ts.Node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.escapedText === "System" &&
        node.expression.name.escapedText === "register"
      ) {
        return context.factory.updateCallExpression(
          node,
          context.factory.createPropertyAccessExpression(
            context.factory.createIdentifier("System"),
            context.factory.createIdentifier("register"),
          ),
          undefined,
          [
            context.factory.createStringLiteral(instantiateName),
            ...node.arguments,
          ],
        );
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (node: ts.Node) => {
      return ts.visitNode(node, visit) as ts.SourceFile;
    };
  };
}
