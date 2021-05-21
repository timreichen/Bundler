import { colors, ImportMap, path, ts } from "../../../deps.ts";
import { addRelativePrefix, isURL } from "../../../_util.ts";
import { resolve as resolveDependency } from "../../../dependency.ts";
import { getAsset, Graph } from "../../../graph.ts";
import { DependencyType, Item } from "../../plugin.ts";

/**
 * injects dependency paths
 */
export function typescriptInjectDependenciesTranformer(
  item: Item,
  { graph, importMap }: { graph: Graph; importMap: ImportMap },
): ts.TransformerFactory<ts.SourceFile> {
  const { history, type } = item;
  const rootInput = history[history.length - 1];

  const rootAsset = getAsset(
    graph,
    rootInput,
    DependencyType.Import, /* entry type */
  );
  const rootOutput = rootAsset.output;
  const rootDirPath = path.dirname(
    rootOutput,
  );

  const bundleInput = history[0];
  const bundleAsset = getAsset(graph, bundleInput, type);
  const bundleOutput = bundleAsset.output;
  const bundleDirPath = path.dirname(
    bundleOutput,
  );

  return (context: ts.TransformationContext) => {
    const visitor = (sourceFile: ts.SourceFile): ts.Visitor => {
      function resolve(filePath: string) {
        return resolveDependency(
          sourceFile.fileName,
          filePath,
          importMap,
        );
      }
      return (node: ts.Node) => {
        if (ts.isImportDeclaration(node)) {
          // if (importClause?.isTypeOnly) return node;
          const moduleSpecifier = node.moduleSpecifier;
          if (ts.isStringLiteral(moduleSpecifier)) {
            const resolvedSpecifier = resolve(moduleSpecifier.text);
            const asset = getAsset(
              graph,
              resolvedSpecifier,
              DependencyType.Import,
            );

            const relativeOutput = path.relative(
              bundleDirPath,
              asset.output,
            );
            const relativeFilePath = addRelativePrefix(relativeOutput);

            return context.factory.updateImportDeclaration(
              node,
              node.decorators,
              node.modifiers,
              node.importClause,
              context.factory.createStringLiteral(relativeFilePath),
            );
          }
        } else if (ts.isExportDeclaration(node)) {
          // if (node.isTypeOnly) return node;
          const moduleSpecifier = node.moduleSpecifier;
          if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
            const resolvedSpecifier = resolve(moduleSpecifier.text);
            const asset = getAsset(
              graph,
              resolvedSpecifier,
              DependencyType.Export,
            );

            const relativeOutput = path.relative(
              bundleDirPath,
              asset.output,
            );
            const relativeFilePath = addRelativePrefix(relativeOutput);

            return context.factory.updateExportDeclaration(
              node,
              node.decorators,
              node.modifiers,
              node.isTypeOnly,
              node.exportClause,
              context.factory.createStringLiteral(relativeFilePath),
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
            const resolvedSpecifier = resolve(argument.text);

            const asset = getAsset(
              graph,
              resolvedSpecifier,
              DependencyType.DynamicImport,
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
              // [context.factory.createStringLiteral(resolvedSpecifier)],
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
          node.expression.text === "fetch"
        ) {
          const argument = node.arguments[0];
          if (ts.isStringLiteral(argument)) {
            const resolvedSpecifier = resolve(argument.text);
            // if is url, skip injection
            if (!isURL(resolvedSpecifier)) {
              const asset = getAsset(
                graph,
                resolvedSpecifier,
                DependencyType.Fetch,
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
          node.expression.text === "Worker"
        ) {
          const argument = node.arguments?.[0];
          if (argument && ts.isStringLiteral(argument)) {
            const resolvedSpecifier = resolve(argument.text);

            const asset = getAsset(
              graph,
              resolvedSpecifier,
              DependencyType.WebWorker,
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
          node.expression.name.text === "register" &&
          ts.isPropertyAccessExpression(node.expression.expression) &&
          node.expression.expression.name.text === "serviceWorker"
        ) {
          const argument = node.arguments?.[0];
          if (argument && ts.isStringLiteral(argument)) {
            const resolvedSpecifier = resolve(argument.text);

            const asset = getAsset(
              graph,
              resolvedSpecifier,
              DependencyType.ServiceWorker,
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
        return ts.visitEachChild(node, visitor(sourceFile), context);
      };
    };
    return (node: ts.SourceFile) => ts.visitNode(node, visitor(node));
  };
}
