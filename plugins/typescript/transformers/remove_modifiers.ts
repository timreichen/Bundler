import { ts } from "../../../deps.ts";

function hasModifier(
  modifiers: ts.ModifiersArray,
  modifier: ts.SyntaxKind,
) {
  return modifiers.find((moduleSpecifier: ts.Modifier) =>
    moduleSpecifier.kind === modifier
  );
}
function removeModifiers(
  modifiers: ts.ModifiersArray,
  removeModifiers: ts.SyntaxKind[],
): ts.NodeArray<ts.Modifier> {
  return ts.createNodeArray(
    modifiers?.filter((moduleSpecifier: ts.Modifier) =>
      !removeModifiers.includes(moduleSpecifier.kind)
    ),
  );
}

/**
 * remove `export` and `export default` keywords
 */
export function typescriptRemoveModifiersTransformer(): ts.TransformerFactory<
  ts.SourceFile
> {
  return (context: ts.TransformationContext) => {
    const visitor: ts.Visitor = (node: ts.Node) => {
      if (ts.isExportAssignment(node)) {
        // export default "abc"
        return undefined;
      } else if (ts.isVariableStatement(node)) {
        // export const x = "x"
        if (
          node.modifiers &&
          hasModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
        ) {
          node = ts.updateVariableStatement(
            node,
            removeModifiers(node.modifiers, [ts.SyntaxKind.ExportKeyword]),
            node.declarationList,
          );
        }
      } else if (ts.isFunctionDeclaration(node) && node.name) {
        if (
          node.modifiers &&
          hasModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
        ) {
          node = ts.updateFunctionDeclaration(
            node,
            node.decorators,
            removeModifiers(node.modifiers, [
              ts.SyntaxKind.ExportKeyword,
              ts.SyntaxKind.DefaultKeyword,
            ]),
            node.asteriskToken,
            node.name,
            node.typeParameters,
            node.parameters,
            node.type,
            node.body,
          );
        }
      } else if (ts.isClassDeclaration(node) && node.name) {
        if (
          node.modifiers &&
          hasModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
        ) {
          node = ts.updateClassDeclaration(
            node,
            node.decorators,
            removeModifiers(node.modifiers, [
              ts.SyntaxKind.ExportKeyword,
              ts.SyntaxKind.DefaultKeyword,
            ]),
            node.name,
            node.typeParameters,
            node.heritageClauses,
            node.members,
          );
        }
      }
      return ts.visitEachChild(node, visitor, context);
    };
    return (node: ts.SourceFile) =>
      ts.visitNode(node, (child: ts.Node) => visitor(child));
  };
}
