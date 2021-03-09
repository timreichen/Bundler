import { colors, ImportMap, path, ts } from "../../../deps.ts";
import { addRelativePrefix, isURL } from "../../../_util.ts";
import { resolve as resolveDependency } from "../../../dependency.ts";
import { getAsset, Graph } from "../../../graph.ts";
import { Chunk, DependencyType } from "../../plugin.ts";

export function typescriptInjectDependenciesTranformer(
  sourceFile: ts.SourceFile,
  chunk: Chunk,
  { graph, importMap }: { graph: Graph; importMap: ImportMap },
): ts.TransformerFactory<ts.SourceFile> {
  const { history, type } = chunk;
  const rootInput = history[history.length - 1];
  
  const rootAsset = getAsset(
    graph,
    DependencyType.Import, /* entry type */
    rootInput,
  );
  const rootOutput = rootAsset.output;
  const rootDirPath = path.dirname(
    rootOutput,
  );

  const bundleInput = history[0];
  const bundleAsset = getAsset(graph, type, bundleInput);
  const bundleOutput = bundleAsset.output;
  const bundleDirPath = path.dirname(
    bundleOutput,
  );
    
  return (context: ts.TransformationContext) => {
    function resolve(filePath: string) {
      return resolveDependency(
        sourceFile.fileName,
        filePath,
        importMap,
      );
    }

    const visit: ts.Visitor = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const importClause = node.importClause;
        if (importClause?.isTypeOnly) return node;
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const resolvedFilePath = resolve(moduleSpecifier.text);
          // const asset = getAsset(
          //   graph,
          //   resolvedFilePath,
          //   DependencyType.DynamicImport,
          // );
          // const relativeOutput = path.relative(
          //   bundleDirPath,
          //   asset.output,
          // );
          return context.factory.updateImportDeclaration(
            node,
            node.decorators,
            node.modifiers,
            node.importClause,
            // context.factory.createStringLiteral(relativeOutput),
            context.factory.createStringLiteral(resolvedFilePath), // input instead of output. Needed for System register
          );
        }
      } else if (ts.isExportDeclaration(node)) {
        if (node.isTypeOnly) return node;
        const moduleSpecifier = node.moduleSpecifier;
        if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
          const resolvedFilePath = resolve(moduleSpecifier.text);

          return context.factory.updateExportDeclaration(
            node,
            node.decorators,
            node.modifiers,
            node.isTypeOnly,
            node.exportClause,
            context.factory.createStringLiteral(resolvedFilePath),
          );
        }

        return node;
      } else if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword
      ) {
        const argument = node.arguments[0];
        if (ts.isStringLiteral(argument)) {
          // import("./x.ts")
          const resolvedFilePath = resolve(argument.text);

          const asset = getAsset(
            graph,
            DependencyType.DynamicImport,
            resolvedFilePath,
          );
          const relativeOutput = path.relative(
            bundleDirPath,
            asset.output,
          );

          const relativeFilePath = addRelativePrefix(relativeOutput);

          return context.factory.updateCallExpression(
            node,
            node.expression,
            node.typeArguments,
            // [context.factory.createStringLiteral(resolvedFilePath)],
            [context.factory.createStringLiteral(relativeFilePath)],
          );
        } else {
          console.warn(
            colors.yellow("Warning"),
            `The argument in dynamic import is not a static string. Cannot resolve '${
              node.getFullText(sourceFile)
            }' in '${sourceFile.fileName}' at position ${node.pos}.`,
          );
        }
      } else if (
        ts.isCallExpression(node) && ts.isIdentifier(node.expression) &&
        node.expression.escapedText === "fetch"
      ) {
        const argument = node.arguments[0];
        if (ts.isStringLiteral(argument)) {
          const resolvedFilePath = resolve(argument.text);
          // if is url, skip injection
          if (!isURL(resolvedFilePath)) {
            const asset = getAsset(
              graph,
              DependencyType.Fetch,
              resolvedFilePath,
            );

            const relativeOutput = path.relative(
              rootDirPath,
              asset.output,
            );
            
            const relativeFilePath = addRelativePrefix(relativeOutput);
              
            return context.factory.updateCallExpression(
              node,
              node.expression,
              node.typeArguments,
              [context.factory.createStringLiteral(relativeFilePath)],
            );
          }
        }
      } else if (
        ts.isNewExpression(node) && ts.isIdentifier(node.expression) &&
        node.expression.escapedText === "Worker"
      ) {
        const argument = node.arguments?.[0];
        if (argument && ts.isStringLiteral(argument)) {
          const resolvedFilePath = resolve(argument.text);

          const asset = getAsset(
            graph,
            DependencyType.WebWorker,
            resolvedFilePath,
          );

          const relativeOutput = path.relative(
            rootDirPath,
            asset.output,
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
          const resolvedFilePath = resolve(argument.text);

          const asset = getAsset(
            graph,
            DependencyType.ServiceWorker,
            resolvedFilePath,
          );
          const relativeOutput = path.relative(
            rootDirPath,
            asset.output,
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
