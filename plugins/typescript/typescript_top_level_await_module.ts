import { colors, fs, ImportMap, path, ts } from "../../deps.ts";
import { addRelativePrefix, timestamp } from "../../_util.ts";
import { Chunk, Context, DependencyType, Format, Item } from "../plugin.ts";
import { TypescriptPlugin } from "./typescript.ts";
import { Asset, getAsset, Graph } from "../../graph.ts";
import { typescriptInjectDependenciesTranformer } from "./transformers/inject_dependencies.ts";
import { typescriptTransformDynamicImportTransformer } from "./transformers/dynamic_imports.ts";
import { typescriptTransformImportsExportsTransformer } from "./transformers/imports_exports.ts";
import { typescriptRemoveModifiersTransformer } from "./transformers/remove_modifiers.ts";
import { typescriptInjectIdentifiersTransformer } from "./transformers/inject_identifiers.ts";
import { typescriptExtractIdentifiersTransformer } from "./transformers/extract_identifiers.ts";
import { getIdentifier } from "./transformers/_util.ts";

export const defaultCompilerOptions: ts.CompilerOptions = {
  // needed for plugin to work correctly
  target: ts.ScriptTarget.Latest,
  module: ts.ModuleKind.ESNext,
};

const printer: ts.Printer = ts.createPrinter({ removeComments: false });

function createDefaultExportNode(node: ts.Expression) {
  return ts.factory.createExportAssignment(
    undefined,
    undefined,
    undefined,
    node,
  );
}
function createReturnNode(
  identifierMap: Map<string, string>,
  exportIdentifierMap: Record<string, string>,
  exportNamespaces: string[],
) {
  console.log(exportIdentifierMap);

  const exportPropertyNodes: ts.ObjectLiteralElementLike[] = Object.entries(
    exportIdentifierMap,
  )
    .map(([key, value]) => {
      if (identifierMap.has(value)) {
        value = identifierMap.get(value) as string;
      }

      if (key === value) {
        return ts.factory.createShorthandPropertyAssignment(
          ts.factory.createIdentifier(value),
          undefined,
        );
      } else {
        return ts.factory.createPropertyAssignment(
          ts.factory.createIdentifier(key),
          ts.factory.createIdentifier(value),
        );
      }
    });

  exportNamespaces.forEach((namespace) => {
    const node = ts.factory.createSpreadAssignment(
      ts.factory.createAwaitExpression(ts.factory.createIdentifier(namespace)),
    );
    exportPropertyNodes.push(node);
  });

  return ts.factory.createReturnStatement(
    ts.factory.createObjectLiteralExpression(
      exportPropertyNodes,
      false,
    ),
  );
}
function createIIFENode(
  nodes: ts.Statement[],
) {
  return ts.factory.createCallExpression(
    ts.factory.createParenthesizedExpression(ts.factory.createArrowFunction(
      [ts.factory.createModifier(ts.SyntaxKind.AsyncKeyword)],
      undefined,
      [],
      undefined,
      ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
      ts.factory.createBlock(
        nodes,
        true,
      ),
    )),
    undefined,
    [],
  );
}

const regex = /^(?<name>[A-Z_$][A-Z0-9_$]*?)(?<number>\d*)$/i;
function createIdentifier(
  identifier: string,
  blacklistIdentifiers: Set<string>,
) {
  const match = regex.exec(identifier);
  const { name, number } = match!.groups!;
  let newIdentifier = identifier;
  let index: number = Number(number) || 1;
  while (blacklistIdentifiers.has(newIdentifier)) {
    newIdentifier = `${name}${index}`;
    index += 1;
  }
  return newIdentifier;
}
function createIdentifierMap(
  identifiers: Set<string>,
  blacklistIdentifiers: Set<string>,
) {
  const identifierMap: Map<string, string> = new Map();
  identifiers.forEach((identifier) => {
    let value = identifier;
    if (identifier === "default") {
      value = "_default";
    }
    let newIdentifier = createIdentifier(
      value,
      blacklistIdentifiers,
    );
    blacklistIdentifiers.add(newIdentifier);
    identifierMap.set(identifier, newIdentifier);
  });

  return identifierMap;
}
function addIdentifiers(
  importIdentifierMap: Map<string, string>,
  identifiers: string[],
) {
  identifiers.forEach((identifier) => {
    if (importIdentifierMap.has(identifier)) return;
    const importSpecifier = `mod${
      importIdentifierMap.size === 0 ? "" : importIdentifierMap.size
    }`;
    importIdentifierMap.set(identifier, importSpecifier);
  });
}

const defaultBlacklistIdentifiers = {
  "default": "_default",
};
function createTopLevelAwaitModuleNode(
  chunk: Chunk,
  asset: Asset,
  sourceFile: ts.SourceFile,
  importIdentifierMap: Map<string, string>,
  exportIdentifierMap: Record<string, string>,
  { graph, importMap }: { graph: Graph; importMap: ImportMap },
) {
  // these identifierMap are reserved for constants tha represent imports
  const blacklistIdentifiers = new Set(importIdentifierMap.values());
  Object.values(defaultBlacklistIdentifiers).forEach((value) =>
    blacklistIdentifiers.add(value)
  );

  const identifiers: Set<string> = new Set();
  ts.transform(sourceFile, [
    typescriptExtractIdentifiersTransformer(identifiers),
  ]);

  const identifierMap = createIdentifierMap(identifiers, blacklistIdentifiers);
  // replace "default" with "_default" to avoid invalid identifiers
  Object.entries(defaultBlacklistIdentifiers).forEach(([key, value]) =>
    identifierMap.set(key, value)
  );

  const { transformed, diagnostics } = ts.transform(sourceFile, [
    typescriptInjectIdentifiersTransformer(identifierMap, blacklistIdentifiers),
    typescriptTransformImportsExportsTransformer(
      importMap,
      importIdentifierMap,
      identifierMap,
    ),
    typescriptRemoveModifiersTransformer(),
    typescriptTransformDynamicImportTransformer(),
    typescriptInjectDependenciesTranformer(chunk, { graph, importMap }),
  ]);

  const exportNamespaces: string[] = [];

  Object.entries(asset.dependencies.exports).forEach(
    ([filePath, { namespaces }]: any) => {
      namespaces.forEach((namespace: string) => {
        if (namespace === undefined) {
          const identifier = getIdentifier(importIdentifierMap, filePath);
          exportNamespaces.push(identifier);
        } else {
          exportIdentifierMap[namespace] = namespace;
        }
      });
    },
  );

  const functionNode = createIIFENode([
    ...transformed[0].statements,
    createReturnNode(identifierMap, exportIdentifierMap, exportNamespaces),
  ]);

  if (diagnostics?.length) throw Error(diagnostics![0].messageText as string);
  return functionNode;
}

/**
  * check whether dependency is shared between chunks. If so, make sure that dependency creates its own chunk.
  * This prevents duplicate code across multiple bundle files
  */
function isSharedChunk(
  chunks: Chunk[],
  bundleInput: string,
  dependency: string,
) {
  return chunks.some((chunk) =>
    chunk.history[0] !== bundleInput &&
    chunk.dependencies.some((dep) => dep.history[0] === dependency)
  );
}
function createSharedChunk(
  chunks: Chunk[],
  input: string,
  asset: Asset,
  chunk: Chunk,
) {
  if (chunks.some((chunk) => chunk.history[0] === input)) return;
  const dependencies = Object.entries(asset.dependencies.imports).map(
      ([input, { type, format }]) => {
        return {
          history: [input, ...chunk.history],
          type,
          format,
        };
      },
    ),
    dependencyChunk: Chunk = {
      history: [input, ...chunk.history],
      dependencies: [
        ...dependencies,
        {
          history: [input, ...chunk.history],
          type: DependencyType.Import,
          format: Format.Script,
        },
      ],
      format: Format.Script,
      type: DependencyType.Import,
    };

  chunks.push(dependencyChunk);
  return dependencyChunk;
}

function createDependencyGraph(dependencyList: Item[], graph: Graph) {
  const inputs = dependencyList.map(({ history }) => history[0]);
  const dependencyGraph: Record<string, string[]> = {};
  const checkedItems = new Set();
  for (const dependencyItem of dependencyList) {
    const input = dependencyItem.history[0];
    if (checkedItems.has(input)) continue;
    checkedItems.add(input);
    const asset = getAsset(
      graph,
      input,
      dependencyItem.type,
    );
    const dependencies = [
      ...new Set([
        ...Object.keys(asset.dependencies.imports),
        ...Object.keys(asset.dependencies.exports),
      ]),
    ].filter((dependency) =>
      dependency !== input && inputs.includes(dependency)
    );

    dependencyGraph[input] = dependencies;
  }
  return dependencyGraph;
}

function topologicalSort(graph: Record<string, string[]>) {
  const result: string[] = [];
  const visited: Record<string, boolean> = {};

  function sort(
    input: string,
    visited: Record<string, boolean>,
    graph: Record<string, string[]>,
    result: string[],
  ) {
    const dependencies = graph[input];

    for (let dependency of dependencies) {
      if (!visited[dependency]) {
        sort(dependency, visited, graph, result);
      }
    }
    visited[input] = true;
    result.push(input);
  }

  for (const input of Object.keys(graph)) {
    if (!visited[input]) {
      sort(input, visited, graph, result);
    }
  }
  return result;
}

export class TypescriptTopLevelAwaitModulePlugin extends TypescriptPlugin {
  constructor(
    {
      compilerOptions = {},
    }: {
      compilerOptions?: ts.CompilerOptions;
    } = {},
  ) {
    super({ compilerOptions });
  }

  async createBundle(
    chunk: Chunk,
    context: Context,
  ) {
    const bundleInput = chunk.history[0];
    const { chunks, graph, importMap, reload, bundler } = context;

    const bundleAsset = getAsset(graph, bundleInput, chunk.type);

    let bundleNeedsUpdate = false;

    const importIdentifierMap: Map<string, string> = new Map();

    const importItems: Item[] = [];
    const inlineItems: Item[] = [];

    const bundleDependency = {
      history: chunk.history,
      type: chunk.type,
      format: chunk.format,
    };

    const dependencyList = [bundleDependency, ...chunk.dependencies];
    const dependencyGraph = createDependencyGraph(dependencyList, graph);

    const sorted = topologicalSort(dependencyGraph);

    for (const s of sorted) {
      const dependencyItem = dependencyList.find((dependencyItem) =>
        dependencyItem.history[0] === s
      )!;
      const { history, type } = dependencyItem;
      const input = history[0];

      const asset = getAsset(graph, input, type);
      const shared = isSharedChunk(chunks, bundleInput, input);
      addIdentifiers(importIdentifierMap, [input]);

      if (
        input === bundleInput || !shared
      ) {
        inlineItems.push(dependencyItem);
      } else if (
        Object.keys(bundleAsset.dependencies.imports).some((dependency) =>
          dependency === input
        )
      ) {
        createSharedChunk(chunks, input, asset, chunk);
        importItems.push(dependencyItem);
      }
    }

    const bundleSources: Record<string, string> = {};

    for (const dependencyItem of inlineItems) {
      const time = performance.now();
      const { history, type } = dependencyItem;
      const input = history[0];

      const asset = getAsset(graph, input, type);

      const needsReload = reload === true ||
        Array.isArray(reload) && reload.includes(input);

      const needsUpdate = needsReload ||
        !await bundler.hasCache(bundleInput, input, context);

      if (needsUpdate) {
        const t1 = performance.now();

        const { bundler } = context;
        bundleNeedsUpdate = true;

        let newSourceFile: any;
        switch (asset.format) {
          case Format.Script: {
            const sourceFile = await bundler.transformSource(
              bundleInput,
              dependencyItem,
              context,
            ) as ts.SourceFile;

            const exportIdentifierMap: Record<string, string> = {};

            Object.entries(asset.dependencies.exports).forEach(
              ([specifier, exports]: any) => {
                Object.entries(exports.specifiers)
                  .forEach(([key, value]: any) => {
                    if (specifier === input) {
                      exportIdentifierMap[key] = value;
                    } else {
                      exportIdentifierMap[key] = key;
                    }
                  });
                exports.defaults.forEach((value: string) => {
                  exportIdentifierMap["default"] = value;
                });
              },
            );

            const isModule = [
              ...Object.keys(asset.dependencies.imports),
              ...Object.keys(asset.dependencies.exports),
            ].length > 0;

            const functionNode = createTopLevelAwaitModuleNode(
              chunk,
              asset,
              sourceFile,
              importIdentifierMap,
              exportIdentifierMap,
              { graph, importMap },
            );

            newSourceFile = sourceFile;

            if (input === bundleInput) {
              if (isModule) {
                const defaultExportNode = createDefaultExportNode(functionNode);
                newSourceFile = ts.factory.createSourceFile(
                  [defaultExportNode],
                  ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
                  ts.NodeFlags.None,
                );
              } else {
                newSourceFile = ts.factory.createSourceFile(
                  [ts.factory.createExpressionStatement(functionNode)],
                  ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
                  ts.NodeFlags.None,
                );
              }
            } else {
              const identifier = getIdentifier(importIdentifierMap, input);
              const variableDeclaration = ts.factory.createVariableStatement(
                undefined,
                ts.factory.createVariableDeclarationList(
                  [ts.factory.createVariableDeclaration(
                    ts.factory.createIdentifier(identifier),
                    undefined,
                    undefined,
                    functionNode,
                  )],
                  ts.NodeFlags.Const,
                ),
              );
              newSourceFile = ts.factory.createSourceFile(
                [variableDeclaration],
                ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
                ts.NodeFlags.None,
              );
            }

            break;
          }
          case Format.Style: {
            const source = await bundler.transformSource(
              history[
                history.length - 1
              ], /* get initial file to set corrent relative css paths */
              dependencyItem,
              context,
            ) as string;
            const sourceNode = ts.factory
              .createNoSubstitutionTemplateLiteral(
                source,
                source,
              );
            const sourceFile = ts.factory.createSourceFile(
              [createDefaultExportNode(sourceNode)],
              ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
              ts.NodeFlags.None,
            );

            const defaultValue = printer.printNode(
              ts.EmitHint.Unspecified,
              sourceNode,
              sourceFile,
            );
            const exportIdentifierMap = {
              default: defaultValue,
            };

            const functionNode = createTopLevelAwaitModuleNode(
              chunk,
              asset,
              sourceFile,
              importIdentifierMap,
              exportIdentifierMap,
              { graph, importMap },
            );

            const identifier = getIdentifier(importIdentifierMap, input);
            const variableDeclaration = ts.factory.createVariableStatement(
              undefined,
              ts.factory.createVariableDeclarationList(
                [ts.factory.createVariableDeclaration(
                  ts.factory.createIdentifier(identifier),
                  undefined,
                  undefined,
                  functionNode,
                )],
                ts.NodeFlags.Const,
              ),
            );
            newSourceFile = ts.factory.createSourceFile(
              [variableDeclaration],
              ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
              ts.NodeFlags.None,
            );

            break;
          }
          case Format.Json: {
            const source = await bundler.transformSource(
              bundleInput,
              dependencyItem,
              context,
            ) as string;

            const sourceNode = ts.factory.createIdentifier(source);
            const sourceFile = ts.factory.createSourceFile(
              [createDefaultExportNode(sourceNode)],
              ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
              ts.NodeFlags.None,
            );

            const defaultValue = printer.printNode(
              ts.EmitHint.Unspecified,
              sourceNode,
              sourceFile,
            );
            const exportIdentifierMap = {
              default: defaultValue,
            };

            const functionNode = createTopLevelAwaitModuleNode(
              chunk,
              asset,
              sourceFile,
              importIdentifierMap,
              exportIdentifierMap,
              { graph, importMap },
            );
            const identifier = getIdentifier(importIdentifierMap, input);
            const variableDeclaration = ts.factory.createVariableStatement(
              undefined,
              ts.factory.createVariableDeclarationList(
                [ts.factory.createVariableDeclaration(
                  ts.factory.createIdentifier(identifier),
                  undefined,
                  undefined,
                  functionNode,
                )],
                ts.NodeFlags.Const,
              ),
            );

            newSourceFile = ts.factory.createSourceFile(
              [variableDeclaration],
              ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
              ts.NodeFlags.None,
            );
            break;
          }
        }
        if (!newSourceFile) {
          throw new Error(
            `newSourceFile is invalid: ${input} in ${bundleInput}`,
          );
        }
        context.bundler.logger.trace(
          "Transform",
          input,
          colors.dim(colors.italic(`(${timestamp(t1)})`)),
        );
        const t2 = performance.now();
        const source = printer.printList(
          ts.ListFormat.SourceFileStatements,
          newSourceFile.statements,
          newSourceFile,
        );
        context.bundler.logger.trace(
          "Print",
          input,
          colors.dim(colors.italic(`(${timestamp(t2)})`)),
        );

        const t3 = performance.now();
        const transpiledSource = ts.transpile(source, {
          ...defaultCompilerOptions,
          ...this.compilerOptions,
        });
        context.bundler.logger.trace(
          "Transpile",
          input,
          colors.dim(colors.italic(`(${timestamp(t3)})`)),
        );

        if (transpiledSource === undefined) {
          throw new Error(
            `transpiledSource must be a string: ${input} in ${bundleInput}`,
          );
        }
        context.bundler.logger.debug(
          colors.yellow(`Update`),
          input,
          colors.dim(colors.italic(`(${timestamp(time)})`)),
        );
        const commentedTranspiledSource = `/* ${input} */\n${transpiledSource}`;
        await bundler.setCache(
          bundleInput,
          input,
          commentedTranspiledSource,
          context,
        );
        bundleSources[input] = commentedTranspiledSource;
      } else {
        context.bundler.logger.debug(
          colors.green(`up-to-date`),
          input,
          colors.dim(colors.italic(`(${timestamp(time)})`)),
        );
        const source = await bundler.getCache(bundleInput, input, context);
        if (source === undefined) {
          throw Error(`cache file for input not found: '${input}'`);
        }
        bundleSources[input] = source;
      }
    }

    if (!bundleNeedsUpdate && await fs.exists(bundleAsset.output)) {
      // exit if no changes occured
      return;
    }

    const importNodes = importItems.map(
      (importItem) => {
        const { history, type } = importItem;
        const input = history[0];
        const identifier = getIdentifier(importIdentifierMap, input);
        const asset = getAsset(graph, input, type);
        const relativeOutput = addRelativePrefix(
          path.relative(path.dirname(bundleAsset.output), asset.output),
        );
        return ts.factory.createImportDeclaration(
          undefined,
          undefined,
          ts.factory.createImportClause(
            false,
            ts.factory.createIdentifier(identifier),
            undefined,
          ),
          ts.factory.createStringLiteral(relativeOutput),
        );
      },
    );

    // const statements = Object.entries(bundleSources)
    //   .flatMap(([input, source]) => {
    //     const sourceFile = ts.createSourceFile(
    //       input,
    //       source,
    //       ts.ScriptTarget.Latest,
    //       undefined,
    //       ts.ScriptKind.JS,
    //     );

    //     ts.addSyntheticLeadingComment(
    //       sourceFile.getChildAt(0),
    //       ts.SyntaxKind.MultiLineCommentTrivia,
    //       ` ${input} `,
    //       true,
    //     );
    //     return sourceFile.getChildren(sourceFile) as ts.Statement[];
    //   });

    const sourceFile = ts.factory.createSourceFile(
      [
        ...importNodes,
        // ...statements,
      ],
      ts.createToken(ts.SyntaxKind.EndOfFileToken),
      ts.NodeFlags.None,
    );

    return `${printer.printFile(sourceFile)}\n${
      Object.values(bundleSources).join("\n")
    }`;
  }
}
