import { typescriptTransformDynamicImportTransformer } from "./transformers/dynamic_imports.ts";
import { typescriptExtractIdentifiersTransformer } from "./transformers/extract_identifiers.ts";
import { typescriptTransformImportsExportsTransformer } from "./transformers/imports_exports.ts";
import { typescriptInjectDependenciesTranformer } from "./transformers/inject_dependencies.ts";
import { typescriptInjectIdentifiersTransformer } from "./transformers/inject_identifiers.ts";
import { typescriptRemoveModifiersTransformer } from "./transformers/remove_modifiers.ts";
import { getIdentifier } from "./transformers/_util.ts";
import { colors, fs, path, ts } from "../../deps.ts";
import { Asset, getAsset, Graph } from "../../graph.ts";
import { Logger, logLevels } from "../../logger.ts";
import { addRelativePrefix, timestamp } from "../../_util.ts";
import { Chunk, Context, DependencyType, Format, Item } from "../plugin.ts";
import { TypescriptPlugin } from "./typescript.ts";
import { topologicalSort } from "./_util.ts";

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

const regex = /^(?<name>[A-Z_$][A-Z0-9α-ω_$]*?)(?<number>\d*)$/i;
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
    
    const newIdentifier = createIdentifier(
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
  { graph, importMap }: { graph: Graph; importMap: Deno.ImportMap },
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

  if (diagnostics?.length) throw Error(diagnostics![0].messageText as string);

  const exportNamespaces: string[] = [];

  Object.entries(asset.dependencies.exports).forEach(
    ([input, { namespaces }]) => {
      (namespaces as string[]).forEach((namespace) => {
        if (namespace === undefined) {
          const identifier = getIdentifier(importIdentifierMap, input);
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

async function denoTranspile(
  source: string,
  compilerOptions: Deno.CompilerOptions,
) {
  const name = "/x.tsx";
  const { files } = await Deno.emit(name, {
    sources: {
      [name]: source,
    },
    compilerOptions: {
      target: "esnext",
      module: "esnext",
      strict: false,
      ...compilerOptions,
    },
    check: false,
  });
  return files[`file://${name}.js`];
}
function tsTranspile(
  source: string,
  compilerOptions: ts.CompilerOptions,
) {
  return ts.transpile(source, {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    ...compilerOptions,
  });
}
async function transpile(
  source: string,
  compilerOptions: Deno.CompilerOptions,
) {
  return await denoTranspile(source, compilerOptions);
  const tsCompilerOptions =
    ts.convertCompilerOptionsFromJson({ compilerOptions }, Deno.cwd())
      .options;
  return await tsTranspile(source, {
    jsx: ts.JsxEmit.React,
    jsxFactory: "React.createElement",
    jsxFragmentFactory: "React.Fragment",
    ...tsCompilerOptions,
  });
}

export class TypescriptTopLevelAwaitModulePlugin extends TypescriptPlugin {
  async createBundle(bundleChunk: Chunk, context: Context) {
    const { chunks, graph, importMap, reload, bundler, logger } = context;
    const bundleItem = bundleChunk.item;
    const bundleInput = bundleItem.history[0];

    const importItems: Record<string, Item> = {};
    const inlineItems: Record<string, Item> = {};

    inlineItems[bundleInput] = bundleItem;

    const importIdentifierMap: Map<string, string> = new Map();

    const dependencyItems = [...bundleChunk.dependencyItems];

    for (const dependencyItem of dependencyItems) {
      const { history, type } = dependencyItem;
      const input = history[0];

      const asset = getAsset(graph, input, type);

      addIdentifiers(importIdentifierMap, [
        input,
        ...Object.keys(asset.dependencies.imports),
        ...Object.keys(asset.dependencies.exports),
      ]);

      if (
        chunks.some((chunk) => chunk.item.history[0] === input)
      ) {
        if (importItems[input]) continue;
        importItems[input] = dependencyItem;
        logger.debug(
          colors.dim(`→`),
          colors.dim(`Import`),
          colors.dim(input),
          colors.dim(
            `{ ${Format[dependencyItem.format]} }`,
          ),
        );
      } else {
        if (inlineItems[input]) continue;
        inlineItems[input] = dependencyItem;
        logger.debug(
          colors.dim(`→`),
          colors.dim(`Inline`),
          colors.dim(input),
          colors.dim(
            `{ ${Format[dependencyItem.format]} }`,
          ),
        );
        const chunk = await bundler.createChunk(dependencyItem, {
          ...context,
          logger: new Logger({
            logLevel: logger.logLevel,
            quiet: true,
          }),
        }, []);
        dependencyItems.push(...chunk.dependencyItems);
      }
    }

    logger.debug(
      colors.dim(`→`),
      colors.dim(`Export`),
      colors.dim(bundleInput),
      colors.dim(
        `{ ${Format[bundleItem.format]} }`,
      ),
    );

    let bundleNeedsUpdate = false;

    const bundleAsset = getAsset(graph, bundleInput, bundleItem.type);

    const sortedInlineItems = topologicalSort(
      Object.values(inlineItems),
      graph,
    );

    const bundleSources: Record<string, string> = {};

    for (const dependencyItem of sortedInlineItems) {
      const { history, type } = dependencyItem;
      const input = history[0];

      const asset = getAsset(graph, input, type);

      const needsReload = reload === true ||
        Array.isArray(reload) && reload.includes(input);

      const needsUpdate = needsReload ||
        !await bundler.hasCache(bundleInput, input, context);

      if (needsUpdate) {
        const transformTime = performance.now();

        const { bundler } = context;
        bundleNeedsUpdate = true;

        let newSourceFile: ts.SourceFile | undefined;

        switch (asset.format) {
          case Format.Script: {
            const sourceFile = await bundler.transformSource(
              bundleInput,
              dependencyItem,
              context,
            ) as ts.SourceFile;

            const exportIdentifierMap: Record<string, string> = {};

            Object.entries(asset.dependencies.exports).forEach(
              ([specifier, exports]) => {
                Object.entries(exports.specifiers)
                  .forEach(([key, value]) => {
                    if (specifier === input) {
                      exportIdentifierMap[key] = value as string;
                    } else {
                      exportIdentifierMap[key] = key;
                    }
                  });
                exports.defaults.forEach((value: string) => {
                  exportIdentifierMap["default"] = value;
                });
              },
            );

            const functionNode = createTopLevelAwaitModuleNode(
              bundleItem,
              asset,
              sourceFile,
              importIdentifierMap,
              exportIdentifierMap,
              { graph, importMap },
            );

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

        logger.trace(
          colors.dim(`→`),
          colors.dim("Transform"),
          colors.dim(input),
          colors.dim(colors.italic(`(${timestamp(transformTime)})`)),
        );

        const printTime = performance.now();
        const source = printer.printFile(newSourceFile);

        const commentedSource = `/* ${input} */\n${source}`;

        logger.trace(
          colors.dim(`→`),
          colors.dim("Print"),
          colors.dim(input),
          colors.dim(colors.italic(`(${timestamp(printTime)})`)),
        );

        await bundler.setCache(
          bundleInput,
          input,
          commentedSource,
          context,
        );
        bundleSources[input] = commentedSource;
      } else {
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

    const importNodes = Object.values(importItems).map(
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

    const sourceFile = ts.factory.createSourceFile(
      importNodes,
      ts.createToken(ts.SyntaxKind.EndOfFileToken),
      ts.NodeFlags.None,
    );

    const moduleString = [
      printer.printFile(sourceFile),
      ...Object.values(bundleSources),
    ].join("\n");

    const transpileTime = performance.now();
    const transpiledSource = await transpile(
      moduleString,
      this.compilerOptions,
    );

    logger.trace(
      colors.dim(`→`),
      colors.dim("Transpile"),
      colors.dim(bundleInput),
      colors.dim(colors.italic(`(${timestamp(transpileTime)})`)),
    );

    return transpiledSource;
  }

  async splitChunks(bundleChunk: Chunk, context: Context) {
    const { chunks, graph, bundler } = context;

    const bundleItem = bundleChunk.item;
    const bundleInput = bundleItem.history[0];

    bundler.logger.debug(colors.yellow("Bundle"), bundleInput);

    const checkedItems = new Set();
    const checkItems = [...bundleChunk.dependencyItems];

    checkItemsLoop:
    for (const checkItem of checkItems) {
      const { history, type } = checkItem;
      const checkInput = history[0];
      if (checkedItems.has(checkInput)) continue;
      checkedItems.add(checkInput);
      // if dependency is already a chunk
      if (chunks.some((chunk) => chunk.item.history[0] === checkInput)) {
        continue;
      }

      bundler.logger.debug(
        colors.dim("→"),
        colors.dim("Check"),
        colors.dim(checkInput),
      );

      const checkedDependencyItems = new Set();
      // if for shared dependencies with other chunk dependencies
      for (const chunk of chunks) {
        const dependencyItems = [...chunk.dependencyItems];
        for (const dependencyItem of dependencyItems) {
          const { history, type } = dependencyItem;
          const dependencyInput = history[0];
          if (chunk === bundleChunk && dependencyInput === checkInput) continue;
          if (checkedDependencyItems.has(dependencyInput)) continue;
          checkedDependencyItems.add(dependencyInput);

          if (
            checkInput === dependencyInput
            && dependencyItem.format === Format.Script
          ) {
            bundler.logger.debug(
              colors.dim("→"),
              colors.yellow("Split"),
              dependencyInput,
              chunk.item.history,
            );
            const logger = new Logger({ logLevel: logLevels.debug });
            logger.quiet = true;
            const newChunk = await bundler.createChunk(
              dependencyItem,
              { ...context, logger },
              [],
            );
            chunks.push(newChunk);
            continue checkItemsLoop;
          }

          if (
            chunks.some((chunk) => chunk.item.history[0] === dependencyInput)
          ) {
            continue;
          }

          const asset = getAsset(graph, dependencyInput, type);
          [
            ...Object.entries(asset.dependencies.imports),
            ...Object.entries(asset.dependencies.exports),
          ].forEach(([dependency, entry]) => {
            dependencyItems.push({
              history: [dependency, ...history],
              format: entry.format,
              type: entry.type,
            });
          });
        }
      }

      // if no shared dependency is found, check sub dependencies
      const asset = getAsset(graph, checkInput, type);
      [
        ...Object.entries(asset.dependencies.imports),
        ...Object.entries(asset.dependencies.exports),
      ].forEach(([dependency, entry]) => {
        if (dependency === checkInput) return;
        checkItems.push({
          history: [dependency, ...history],
          format: entry.format,
          type: entry.type,
        });
      });
    }
  }
}
