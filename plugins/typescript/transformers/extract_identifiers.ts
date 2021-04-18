import { ts } from "../../../deps.ts";

export function typescriptExtractIdentifiersTransformer(
  identifiers: Set<string>,
) {
  return (context: ts.TransformationContext) => {
    const visitor = (sourceFile: ts.SourceFile): ts.Visitor =>
      (node: ts.Node) => {
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
          // const x = "x"
          const text = node.name.text;
          identifiers.add(text);
        }
        return ts.visitEachChild(node, visitor(sourceFile), context);
      };
    return (node: ts.SourceFile) =>
      ts.visitNode(node, (child: ts.Node) => visitor(node)(child));
  };
}
