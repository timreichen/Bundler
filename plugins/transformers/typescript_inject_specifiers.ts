import { ImportMap, ts, path } from "../../deps.ts";
import { FileMap, getOutput, Graph } from "../../graph.ts";
import {
  isImportNode,
  getImportNode,
  isDynamicImportNode,
  getDynamicImportNode,
  isExportNode,
  getExportNode,
  CompilerOptions,
} from "../../typescript.ts";
import {
  resolve as resolveDependencySpecifier,
} from "../../dependencies.ts";
import { PluginTest, Plugin } from "../plugin.ts";
import { injectInstantiateName } from "../../system.ts";
import { typescript } from "./typescript.ts";

function injectOutputsTranformer(
  input: string,
  source: string,
  { importMap, fileMap, depsPath }: {
    importMap: ImportMap;
    fileMap: FileMap;
    depsPath: string;
  },
) {
  return (context: ts.TransformationContext) => {
    const visit: ts.Visitor = (node: ts.Node) => {
      let specifierNode: ts.Node = null;
      let specifier: string | null = null;
      if (isImportNode(node)) {
        specifierNode = getImportNode(node);
        const specifierText = specifierNode.text;
        const resolvedSpecifier = resolveDependencySpecifier(
          input,
          specifierText,
          importMap,
        );
        specifier = getOutput(resolvedSpecifier, fileMap, depsPath);
      }
      if (isDynamicImportNode(node)) {
        specifierNode = getDynamicImportNode(node, source);
        const specifierText = specifierNode.text;
        const resolvedSpecifier = resolveDependencySpecifier(
          input,
          specifierText,
          importMap,
        );
        specifier = getOutput(resolvedSpecifier, fileMap, depsPath);
        const relativeOutput = path.relative(
          path.dirname(getOutput(input, fileMap, depsPath)),
          specifier!,
        );

        specifier = `./${relativeOutput}`;
      }

      if (isExportNode(node) && node.moduleSpecifier) {
        specifierNode = getExportNode(node);
        const specifierText = specifierNode.text;
        const resolvedSpecifier = resolveDependencySpecifier(
          input,
          specifierText,
          importMap,
        );
        specifier = getOutput(resolvedSpecifier, fileMap, depsPath);
      }

      if (specifierNode) {
        const newNode = ts.createStringLiteral(specifier);

        return ts.visitEachChild(
          node,
          (child: ts.Node) => child === specifierNode ? newNode : child,
          context,
        );
      }

      return ts.visitEachChild(node, visit, context);
    };

    return (node: ts.Node) => {
      return ts.visitNode(node, visit);
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
    const transformers = {
      before: [
        injectOutputsTranformer(
          input,
          source,
          { importMap, fileMap, depsPath },
        ),
      ],
      after: [injectInstantiateName(output)],
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