import { colors, ImportMap, path, ts } from "../../../deps.ts";
import { addRelativePrefix } from "../../../_util.ts";
import { resolve as resolveDependency } from "../../../dependency.ts";
import { Graph } from "../../../graph.ts";
import { Chunk } from "../../../chunk.ts";

export function typescriptInjectOutputsTranformer(
  input: string,
  chunk: Chunk,
  source: string,
  graph: Graph,
  importMap: ImportMap,
): ts.TransformerFactory<ts.SourceFile> {
  const sourceFile = ts.createSourceFile(
    input,
    source,
    ts.ScriptTarget.Latest,
  );

  return (context: ts.TransformationContext) => {
    const visit: ts.Visitor = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const importClause = node.importClause;
        if (importClause?.isTypeOnly) return node;
        const quotedFilePath = node.moduleSpecifier.getText(sourceFile);

        const unquotedFilePath = quotedFilePath.substring(
          1,
          quotedFilePath.length - 1,
        );

        const resolvedFilePath = resolveDependency(
          input,
          unquotedFilePath,
          importMap,
        );

        const outputFilePath = graph[resolvedFilePath].input;

        return context.factory.updateImportDeclaration(
          node,
          node.decorators,
          node.modifiers,
          node.importClause,
          context.factory.createStringLiteral(outputFilePath),
        );
      } else if (ts.isExportDeclaration(node)) {
        if (node.isTypeOnly) return node;

        const moduleFilePath = node.moduleSpecifier;
        if (moduleFilePath) {
          const quotedFilePath = moduleFilePath.getText(sourceFile);
          const unquotedFilePath = quotedFilePath.substring(
            1,
            quotedFilePath.length - 1,
          );

          const resolvedFilePath = resolveDependency(
            input,
            unquotedFilePath,
            importMap,
          );

          const outputFilePath = graph[resolvedFilePath].input;
          return context.factory.updateExportDeclaration(
            node,
            node.decorators,
            node.modifiers,
            node.isTypeOnly,
            node.exportClause,
            context.factory.createStringLiteral(outputFilePath),
          );
        }
        return node;
      } else if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword
      ) {
        const arg = node.arguments[0];
        if (ts.isStringLiteral(arg)) {
          // import("./x.ts")
          const resolvedFilePath = resolveDependency(
            input,
            arg.text,
            importMap,
          );

          const bundleOutputPath = path.dirname(graph[input].output);
          const outputFilePath = graph[resolvedFilePath].output;

          const relativeOutput = path.relative(
            bundleOutputPath,
            outputFilePath,
          );
          const relativeFilePath = addRelativePrefix(relativeOutput);

          return context.factory.updateCallExpression(
            node,
            node.expression,
            node.typeArguments,
            [context.factory.createStringLiteral(relativeFilePath)],
          );
        } else {
          console.warn(
            colors.yellow("Warning"),
            `The argument in dynamic import is not a static string. Cannot resolve ${
              node.getFullText(sourceFile)
            } at position ${node.pos}.`,
          );
        }
      } else if (
        ts.isNewExpression(node) && ts.isIdentifier(node.expression) &&
        node.expression.escapedText === "Worker"
      ) {
        const argument = node.arguments?.[0];
        if (argument && ts.isStringLiteral(argument)) {
          const resolvedFilePath = resolveDependency(
            input,
            argument.text,
            importMap,
          );

          const bundleInput = chunk.inputHistory[0];
          const bundleOutputPath = path.dirname(graph[bundleInput].output);
          const outputFilePath = graph[resolvedFilePath].output;

          const relativeOutput = path.relative(
            bundleOutputPath,
            outputFilePath,
          );
          const relativeFilePath = addRelativePrefix(relativeOutput);

          return context.factory.updateNewExpression(
            node,
            node.expression,
            node.typeArguments,
            [ts.factory.createStringLiteral(relativeFilePath)],
          );
        }
      } else if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.escapedText === "register" &&
        ts.isPropertyAccessExpression(node.expression.expression) &&
        node.expression.expression.name.escapedText === "serviceWorker"
      ) {
        const argument = node.arguments?.[0];
        if (argument && ts.isStringLiteral(argument)) {
          const resolvedFilePath = resolveDependency(
            input,
            argument.text,
            importMap,
          );

          const bundleInput = chunk.inputHistory[0];
          const bundleOutputPath = path.dirname(graph[bundleInput].output);
          const outputFilePath = graph[resolvedFilePath].output;

          const relativeOutput = path.relative(
            bundleOutputPath,
            outputFilePath,
          );
          const relativeFilePath = addRelativePrefix(relativeOutput);

          return context.factory.updateCallExpression(
            node,
            node.expression,
            node.typeArguments,
            [ts.factory.createStringLiteral(relativeFilePath)],
          );
        }
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (node: ts.Node) => {
      return ts.visitNode(node, visit) as ts.SourceFile;
    };
  };
}
