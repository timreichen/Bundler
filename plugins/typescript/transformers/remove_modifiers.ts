import { ts } from "../../../deps.ts";

const { factory } = ts;

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
export function typescriptRemoveModifiersTransformer() {
  return (context: ts.TransformationContext) => {
    const visitor: ts.Visitor = (node: ts.Node) => {
      if (ts.isExportAssignment(node)) {
        // export default "abc"
        return factory.createVariableStatement(
          undefined,
          factory.createVariableDeclarationList(
            [factory.createVariableDeclaration(
              factory.createIdentifier("_default"),
              undefined,
              undefined,
              node.expression,
            )],
            ts.NodeFlags.Const,
          ),
        );
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
      } else if (
        ts.isEnumDeclaration(node) && node.modifiers &&
        hasModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
      ) {
        node = factory.updateEnumDeclaration(
          node,
          node.decorators,
          removeModifiers(node.modifiers, [
            ts.SyntaxKind.ExportKeyword,
          ]),
          node.name,
          node.members,
        );
      } else if (
        ts.isInterfaceDeclaration(node) && node.modifiers &&
        hasModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
      ) {
        node = factory.updateInterfaceDeclaration(
          node,
          node.decorators,
          removeModifiers(node.modifiers, [
            ts.SyntaxKind.ExportKeyword,
          ]),
          node.name,
          node.typeParameters,
          node.heritageClauses,
          node.members,
        );
      } else if (
        ts.isTypeAliasDeclaration(node) && node.modifiers &&
        hasModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
      ) {
        node = factory.updateTypeAliasDeclaration(
          node,
          node.decorators,
          removeModifiers(node.modifiers, [
            ts.SyntaxKind.ExportKeyword,
          ]),
          node.name,
          node.typeParameters,
          node.type,
        );
      }
      return ts.visitEachChild(node, visitor, context);
    };
    return (node: ts.Node) =>
      ts.visitNode(node, (child: ts.Node) => visitor(child));
  };
}
