import { colors, xts } from "./deps.ts";

const { yellow } = colors;

export function isImportNode(node: xts.Node) {
  return xts.isImportDeclaration(node);
}
export function getImportNode(node: xts.Node) {
  return node.moduleSpecifier;
}

export function isDynamicImportNode(node: xts.Node) {
  return node.kind === xts.SyntaxKind.CallExpression &&
    node.expression.kind === xts.SyntaxKind.ImportKeyword;
}
export function getDynamicImportNode(node: xts.Node, source: string) {
  const arg = node.arguments[0];
  if (!xts.isStringLiteral(arg)) {
    console.warn(
      yellow("Warning"),
      `dynamic import argument is not a static string: Cannot resolve ${
        yellow(
          `import(${
            source.substring(
              arg.pos,
              node.arguments[node.arguments.length - 1].end,
            )
          })`,
        )
      } at index ${arg.pos}`,
    );
    return;
  }
  return arg;
}

export function isExportNode(node: xts.Node) {
  return xts.isExportDeclaration(node);
}
export function getExportNode(node: xts.node) {
  return node.moduleSpecifier;
}

export function getImportExports(
  source: string,
): {
  imports: { [specifier: string]: { dynamic: boolean } };
  exports: string[];
} {
  const imports: { [specifier: string]: xts.Node } = {};
  let exports: string[] = [];

  function transformer() {
    return (context: xts.TransformationContext) => {
      const visit: xts.Visitor = (node: xts.Node) => {
        let specifierNode;
        if (isImportNode(node)) {
          if (node.importClause?.isTypeOnly) return node;
          specifierNode = getImportNode(node);
          return node;
        }
        if (isDynamicImportNode(node)) {
          specifierNode = getDynamicImportNode(node, source);
        }
        if (isExportNode(node)) {
          if (node.importClause?.isTypeOnly) return node;
          specifierNode = getExportNode(node);
          return node;
        }
        if (specifierNode) {
          imports[specifierNode.text] = node;
          return node;
        }
        return xts.visitEachChild(node, visit, context);
      };
      return (node: xts.Node) => {
        if (node.symbol) {
          exports = Object.keys(node.symbol.exports);
        }
        return xts.visitNode(node, visit);
      };
    };
  }

  xts.transform(source, [transformer]);

  return { imports, exports };
}
