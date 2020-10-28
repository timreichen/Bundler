import { colors, ImportMap, path, ts } from "../../deps.ts";
import { FileMap, getOutput, Graph } from "../../graph.ts";
import { CompilerOptions } from "../../_import_export.ts";
import { resolve as resolveDependencySpecifier } from "../../dependencies.ts";
import { Plugin, PluginTest } from "../plugin.ts";
import { injectInstantiateNameTransformer } from "../../system.ts";
import { typescript } from "./typescript.ts";
import { addRelativePrefix } from "../../_util.ts";

function injectOutputsTranformer(
  fileName: string,
  sourceText: string,
  { importMap, fileMap, depsPath, outDir }: {
    importMap: ImportMap;
    fileMap: FileMap;
    outDir: string;
    depsPath: string;
  },
): ts.TransformerFactory<ts.SourceFile> {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
  );
  return (context: ts.TransformationContext) => {
    const visit: ts.Visitor = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const importClause = node.importClause;
        if (importClause?.isTypeOnly) return node;
        const quotedSpecifier = node.moduleSpecifier.getText(sourceFile);
        const unquotedSpecifier = quotedSpecifier.substring(
          1,
          quotedSpecifier.length - 1,
        );

        const resolvedSpecifier = resolveDependencySpecifier(
          fileName,
          unquotedSpecifier,
          importMap,
        );
        const specifier = getOutput(resolvedSpecifier, fileMap, depsPath);

        return context.factory.updateImportDeclaration(
          node,
          node.decorators,
          node.modifiers,
          node.importClause,
          context.factory.createStringLiteral(specifier),
        );
      } else if (ts.isExportDeclaration(node)) {
        if (node.isTypeOnly) return node;

        const moduleSpecifier = node.moduleSpecifier;
        if (moduleSpecifier) {
          const quotedSpecifier = moduleSpecifier.getText(sourceFile);
          const unquotedSpecifier = quotedSpecifier.substring(
            1,
            quotedSpecifier.length - 1,
          );

          const resolvedSpecifier = resolveDependencySpecifier(
            fileName,
            unquotedSpecifier,
            importMap,
          );

          const specifier = getOutput(resolvedSpecifier, fileMap, depsPath);

          return context.factory.updateExportDeclaration(
            node,
            node.decorators,
            node.modifiers,
            node.isTypeOnly,
            node.exportClause,
            context.factory.createStringLiteral(specifier),
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
          const resolvedSpecifier = resolveDependencySpecifier(
            fileName,
            arg.text,
            importMap,
          );
          const specifier = getOutput(resolvedSpecifier, fileMap, depsPath);

          const relativeOutput = path.relative(outDir, specifier);
          const relativeSpecifier = addRelativePrefix(relativeOutput);
          return context.factory.updateCallExpression(
            node,
            node.expression,
            node.typeArguments,
            [context.factory.createStringLiteral(relativeSpecifier)],
          );
        } else {
          console.warn(
            colors.yellow("Warning"),
            `The argument in dynamic import is not a static string. Cannot resolve ${
              node.getFullText(sourceFile)
            } at position ${node.pos}.`,
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

interface Config {
  test?: PluginTest;
  compilerOptions?: CompilerOptions;
}

export function typescriptInjectSpecifiers(
  { test = (input: string) => /\.tsx?$/.test(input), compilerOptions = {} }:
    Config,
) {
  const fn = (
    input: string,
    source: string,
    { graph, importMap, fileMap, outDir, depsDir }: {
      graph: Graph;
      importMap: ImportMap;
      fileMap: FileMap;
      outDir: string;
      depsDir: string;
    },
  ) => {
    const depsPath = path.join(outDir, depsDir);
    const output = getOutput(input, fileMap, depsPath);
    const transformers: ts.CustomTransformers = {
      before: [
        injectOutputsTranformer(
          input,
          source,
          { importMap, fileMap, outDir, depsPath },
        ),
      ],
      after: [injectInstantiateNameTransformer(output)],
    };
    return typescript({
      test,
      compilerOptions,
      transformers,
    }).fn(input, source, { graph, importMap, fileMap, outDir, depsDir });
  };

  return new Plugin({
    test,
    fn,
  });
}
