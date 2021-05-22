import { colors, fs, ImportMap, path, ts } from "../../deps.ts";
import { addRelativePrefix, timestamp } from "../../_util.ts";
import { Chunk, Context, Dependency, Format, Item } from "../plugin.ts";
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
  item: Item,
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
    typescriptInjectDependenciesTranformer(item, { graph, importMap }),
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
// function isSharedChunk(
//   chunks: Chunk[],
//   bundleInput: string,
//   dependency: string,
// ) {
//   return chunks.some((chunk) => {
//     return chunk.history[0] !== dependency &&
//       chunk.history[0] !== bundleInput && chunk.dependencies.some((dep) =>
//         dep.history[0] === dependency
//       );
//   });
// }
// function createSharedChunk(
//   chunks: Chunk[],
//   dependency: string,
//   asset: Asset,
//   item: Item,
// ) {
//   const dependencies = Object.entries(asset.dependencies.imports).map(
//       ([input, { type, format }]) => {
//         return {
//           history: [input, ...item.history],
//           type,
//           format,
//         };
//       },
//     ),
//     dependencyChunk: Chunk = new Map();
//   const newItem = {
//     history: [dependency, ...item.history],
//     format: Format.Script,
//     type: DependencyType.Import,
//   };

//   dependencyChunk.set(newItem, newDependencyItem);
//   chunks.push(dependencyChunk);
//   return dependencyChunk;
// }

function topologicalSort(items: Item[], graph: Graph) {
  const result: Item[] = [];
  const sorted: Set<string> = new Set();
  const itemInputs = items.map((item) => item.history[0]);

  function sort(
    item: Item,
  ) {
    const input = item.history[0];
    if (sorted.has(input)) return;
    sorted.add(input);

    const asset = getAsset(graph, input, item.type);
    const dependencies: [string, Dependency][] = [
      ...Object.entries(asset.dependencies.imports),
      ...Object.entries(asset.dependencies.exports),
    ].filter(([dependency]) => itemInputs.includes(dependency));

    for (let [dependency, dependencyItem] of dependencies) {
      if (
        !sorted.has(dependency)
      ) {
        const newDependencyItem: Item = {
          history: [dependency, ...item.history],
          type: dependencyItem.type,
          format: dependencyItem.format,
        };
        sort(newDependencyItem);
      }
    }
    result.push(item);
  }

  for (const item of items) {
    sort(item);
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
    bundleChunk: Chunk,
    context: Context,
  ) {
    const bundleItem = bundleChunk.item;
    const bundleInput = bundleItem.history[0];
    const { chunks, graph, importMap, reload, bundler } = context;

    bundler.logger.debug("Bundle", bundleInput);

    const bundleAsset = getAsset(graph, bundleInput, bundleItem.type);

    const bundleDependencies = [
      ...Object.entries(bundleAsset.dependencies.imports),
      ...Object.entries(bundleAsset.dependencies.exports),
    ];

    for (const chunk of chunks) {
      if (chunk === bundleChunk) continue;
      const item = chunk.item;
      const asset = getAsset(graph, item.history[0], item.type);
      const dependencies = new Set([
        ...Object.keys(asset.dependencies.imports),
        ...Object.keys(asset.dependencies.exports),
      ]);
      const sharedDependencies = bundleDependencies.filter(([dependency]) =>
        dependencies.has(dependency)
      );

      for (const [sharedDependency, { type, format }] of sharedDependencies) {
        if (
          chunks.some((chunk) => chunk.item.history[0] === sharedDependency)
        ) {
          continue;
        }
        const sharedItem = {
          history: [sharedDependency, ...item.history],
          type,
          format,
        };
        const sharedChunk = await bundler.createChunk(
          sharedItem,
          context,
          [],
        );
        chunks.push(sharedChunk);
        bundler.logger.debug("Split chunk", sharedDependency);
        bundleChunk.dependencyItems.push(sharedItem);
      }
    }

    let bundleNeedsUpdate = false;

    const importItems: Map<string, Item> = new Map();
    const inlineItems: Map<string, Item> = new Map();

    const importIdentifierMap: Map<string, string> = new Map();

    inlineItems.set(bundleChunk.item.history[0], bundleChunk.item);

    let dependencyItems = [...bundleChunk.dependencyItems];
    for (const dependencyItem of dependencyItems) {
      const input = dependencyItem.history[0];
      const asset = getAsset(graph, input, dependencyItem.type);

      addIdentifiers(importIdentifierMap, [
        input,
        ...Object.keys(asset.dependencies.imports),
        ...Object.keys(asset.dependencies.exports),
      ]);

      if (
        chunks.some((chunk) => chunk.item.history[0] === input)
      ) {
        if (importItems.has(input)) continue;
        importItems.set(input, dependencyItem);
        bundler.logger.debug("Import", input);
      } else {
        if (inlineItems.has(input)) continue;
        const chunk = await bundler.createChunk(dependencyItem, context, []);
        dependencyItems.push(...chunk.dependencyItems);
        inlineItems.set(input, dependencyItem);
        bundler.logger.debug("Inline", input);
      }
    }

    const sortedInlineItems = topologicalSort([...inlineItems.values()], graph);

    addIdentifiers(importIdentifierMap, [bundleInput]);

    const bundleSources: Record<string, string> = {};

    for (const dependencyItem of sortedInlineItems) {
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

            // const isModule = [
            //   ...Object.keys(asset.dependencies.imports),
            //   ...Object.keys(asset.dependencies.exports),
            // ].length > 0;

            const functionNode = createTopLevelAwaitModuleNode(
              bundleItem,
              asset,
              sourceFile,
              importIdentifierMap,
              exportIdentifierMap,
              { graph, importMap },
            );

            newSourceFile = sourceFile;

            if (input === bundleInput) {
              const defaultExportNode = createDefaultExportNode(functionNode);
              newSourceFile = ts.factory.createSourceFile(
                [defaultExportNode],
                ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
                ts.NodeFlags.None,
              );
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
              bundleItem,
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
              bundleItem,
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

        // const filePath = `/mod.tsx`;
        //   console.log(source);

        // const { files } = await Deno.emit(filePath, {
        //   sources: {
        //     [filePath]: source,
        //   },
        //   check: false,
        //   // compilerOptions: this.compilerOptions
        // });
        // console.log({ files });

        // const transpiledFilePath = `file://${filePath}.js`;
        // const transpiledSource = files[transpiledFilePath];
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

    const importNodes = [...importItems.values()].map(
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
