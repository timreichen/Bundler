import { ts, colors } from "./deps.ts";

const { yellow } = colors;

export interface CompilerOptions {
  target?: "esnext" | "ES5";
  module?: "esnext" | "system";
}

export function isImportNode(node: ts.Node) {
  return ts.isImportDeclaration(node);
}
export function getImportNode(node: ts.Node) {
  return node.moduleSpecifier;
}

export function isDynamicImportNode(node: ts.Node) {
  return ts.SyntaxKind[node.kind] === "CallExpression" &&
    ts.SyntaxKind[node.expression.kind] === "ImportKeyword";
}
export function getDynamicImportNode(node: ts.Node, source: string) {
  const arg = node.arguments[0];
  if (!ts.isStringLiteral(arg)) {
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

export function isExportNode(node: ts.Node) {
  return ts.isExportDeclaration(node) && node.moduleSpecifier;
}
export function getExportNode(node: ts.node) {
  return node.moduleSpecifier;
}

export function getSpecifierNodeMap(
  source: string,
): {
  imports: { [specifier: string]: ts.Node };
  exports: { [specifier: string]: ts.Node };
} {
  const imports: { [specifier: string]: ts.Node } = {};
  let exports: { [specifier: string]: ts.Node } = {};

  const compilerOptions = {
    target: "ESNext",
    module: "ESNext",
  };

  function transformer() {
    return (context: ts.TransformationContext) => {
      const visit: ts.Visitor = (node: ts.Node) => {
        let specifierNode;
        if (isImportNode(node)) {
          if (node.importClause?.isTypeOnly) return node;
          specifierNode = getImportNode(node);
        }
        if (isExportNode(node)) {
          if (node.importClause?.isTypeOnly) return node;
          specifierNode = getExportNode(node);
        }
        if (isDynamicImportNode(node)) {
          specifierNode = getDynamicImportNode(node, source);
        }
        if (specifierNode) {
          imports[specifierNode.text] = node;
          return node;
        }
        return ts.visitEachChild(node, visit, context);
      };
      return (node: ts.Node) => {
        if (node.symbol) {
          exports = Object.fromEntries(node.symbol.exports.entries());
        }
        return ts.visitNode(node, visit);
      };
    };
  }

  const { diagnostics, outputText } = ts.transpileModule(source, {
    compilerOptions: ts.convertCompilerOptionsFromJson(compilerOptions).options,
    transformers: {
      before: [transformer()],
    },
    reportDiagnostics: true,
  });
  // diagnostics.forEach((diagnostic: any) => console.log(diagnostic))

  return { imports, exports };
}
