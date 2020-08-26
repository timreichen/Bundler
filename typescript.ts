import { ts } from "./deps.ts";
import { yellow } from "https://deno.land/std/fmt/colors.ts";

export interface CompilerOptions {
  target?: "esnext" | "ES5";
  module?: "esnext" | "system";
}

export function traverse(source: string, receiver: (node: ts.Node) => ts.Node) {
  function transformer<T extends ts.Node>(): ts.TransformerFactory<T> {
    return (context: ts.TransformationContext) => {
      const visit: ts.Visitor = (node: ts.Node) =>
        ts.visitEachChild(receiver(node), visit, context);
      return (node: ts.Node) => ts.visitNode(node, visit);
    };
  }

  const sourceFile = ts.createSourceFile(
    "x.ts",
    source,
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS,
  );
  const result = ts.transform(sourceFile, [transformer()]);
  const transformedNodes = result.transformed[0];
  const printer: ts.Printer = ts.createPrinter(
    { newLine: ts.NewLineKind.LineFeed, removeComments: false },
  );
  return printer.printNode(
    ts.EmitHint.SourceFile,
    transformedNodes,
    sourceFile,
  );
}

export function getImportNode(node: ts.Node) {
  if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
    return node.moduleSpecifier;
  }
}

export function getDynamicImportNode(node: ts.Node, source: string) {
  if (
    ts.SyntaxKind[node.kind] === "CallExpression" &&
    ts.SyntaxKind[node.expression.kind] === "ImportKeyword"
  ) {
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
}

export function getExportNode(node: ts.node) {
  if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
    return node.moduleSpecifier;
  }
}
