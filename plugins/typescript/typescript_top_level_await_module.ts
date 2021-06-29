import { colors, fs, path, ts } from "../../deps.ts";
import { Asset, getAsset } from "../../graph.ts";
import { Logger } from "../../logger.ts";
import { addRelativePrefix, timestamp } from "../../_util.ts";
import {
  Chunk,
  Context,
  DependencyType,
  Export,
  Format,
  getFormat,
  Item,
} from "../plugin.ts";
import { typescriptInjectDependenciesTranformer } from "./dependencies/inject_dependencies.ts";
import { extractIdentifiersFromSourceFile } from "./identifiers/extract_identifiers.ts";
import {
  createIdentifierMap,
  createImportIdentifierMap,
  defaultKeyword,
  getIdentifier,
  IdentifierMap,
} from "./identifiers/_util.ts";
import { typescriptTransformDynamicImportTransformer } from "./transformers/dynamic_imports.ts";
import { typescriptTransformImportsExportsTransformer } from "./transformers/imports_exports.ts";
import { typescriptRemoveModifiersTransformer } from "./transformers/remove_modifiers.ts";
import { TypescriptPlugin } from "./typescript.ts";
import { topologicalSort } from "./_util.ts";

const { factory } = ts;

const printer: ts.Printer = ts.createPrinter({ removeComments: false });

async function splitDependencyItems(dependencyItems: Item[], context: Context) {
  const { chunks, logger, bundler } = context;
  const importItemMap: Map<string, Item> = new Map();
  const inlineItemMap: Map<string, Item> = new Map();

  for (const dependencyItem of dependencyItems) {
    const { history } = dependencyItem;
    const input = history[0];
    if (
      chunks.some((chunk) => chunk.item.history[0] === input)
    ) {
      if (importItemMap.has(input)) continue;
      importItemMap.set(input, dependencyItem);
      logger.debug(
        colors.dim(`→`),
        colors.dim(`Import`),
        colors.dim(input),
        colors.dim(
          `{ ${DependencyType[dependencyItem.type]} }`,
        ),
      );
    } else {
      if (inlineItemMap.has(input)) continue;
      inlineItemMap.set(input, dependencyItem);
      logger.debug(
        colors.dim(`→`),
        colors.dim(`Inline`),
        colors.dim(input),
        colors.dim(
          `{ ${DependencyType[dependencyItem.type]} }`,
        ),
      );
      const chunk = await bundler.createChunk(dependencyItem, {
        ...context,
        logger: new Logger({
          logLevel: logger.logLevel,
          quiet: true,
        }),
      }, dependencyItems);
      dependencyItems.push(...chunk.dependencyItems);
    }
  }
  return {
    importItems: [...importItemMap.values()],
    inlineItems: [...inlineItemMap.values()],
  };
}
async function createUpdateItems(
  bundleInput: string,
  inlineItems: Item[],
  context: Context,
) {
  const { reload, bundler } = context;
  const updateItems: Item[] = [];
  for (const dependencyItem of inlineItems) {
    const { history } = dependencyItem;
    const input = history[0];

    const needsReload = reload === true ||
      Array.isArray(reload) && reload.includes(input);
    const dependencyNeedsUpdate = needsReload ||
      !await bundler.hasCache(bundleInput, input, context);

    if (dependencyNeedsUpdate) {
      updateItems.push(dependencyItem);
    }
  }
  return updateItems;
}

/**
 * create iffe expressios from dependencyItems
 * ```ts
 * const mod = (async () => {
 * …
 * })();
 * const mod1 = (async () => {
 * …
 * })();
 * ```
 */
async function createInlineSources(
  bundleItem: Item,
  inlineItems: Item[],
  updateItems: Item[],
  identifierMap: IdentifierMap,
  importIdentifierMap: IdentifierMap,
  context: Context,
) {
  const { graph, bundler } = context;

  const bundleInput = bundleItem.history[0];
  const bundleAsset = getAsset(graph, bundleInput, bundleItem.type);

  const inlineSources: string[] = [];

  for (const inlineItem of inlineItems) {
    const { history } = inlineItem;
    const input = history[0];

    if (
      (Array.isArray(context.reload) && context.reload.includes(input)) ||
      context.reload ||
      updateItems.includes(inlineItem) ||
      !await bundler.hasCache(bundleInput, input, context)
    ) {
      const source = await createInlineSource(
        bundleAsset,
        inlineItem,
        identifierMap,
        importIdentifierMap,
        context,
      );
      inlineSources.push(source);
    } else {
      const source = await bundler.getCache(bundleInput, input, context);
      if (source === undefined) {
        throw Error(`cache file for input not found: '${input}'`);
      }
      inlineSources.push(source);
    }
  }
  return inlineSources;
}

/**
 * create iffe expression from dependencyItem
 * ```ts
 * const mod = (async () => {
 * …
 * })();
 * ```
 */
async function createInlineSource(
  bundleAsset: Asset,
  dependencyItem: Item,
  identifierMap: IdentifierMap,
  importIdentifierMap: IdentifierMap,
  context: Context,
) {
  const { graph, bundler, logger, importMap } = context;

  const bundleInput = bundleAsset.input;
  const bundleOutput = bundleAsset.output;

  const { history, type } = dependencyItem;
  const input = history[0];

  const asset = getAsset(graph, input, type);

  const transformTime = performance.now();

  let newSourceFile: ts.SourceFile | undefined;

  const format = getFormat(input);

  switch (format) {
    case Format.Script: {
      const sourceFile = await bundler.transformSource(
        bundleInput,
        dependencyItem,
        context,
      ) as ts.SourceFile;

      const { transformed } = ts.transform(sourceFile, [
        typescriptTransformImportsExportsTransformer(
          importMap,
          importIdentifierMap,
          identifierMap,
        ),
        typescriptRemoveModifiersTransformer(),
        typescriptTransformDynamicImportTransformer(),
        typescriptInjectDependenciesTranformer(
          bundleOutput,
          dependencyItem,
          { graph, importMap },
        ),
      ]);

      newSourceFile = transformed[0] as ts.SourceFile;

      const iifeNode = createIIFEExpression([
        ...newSourceFile.statements,
        createReturnStatement(identifierMap, importIdentifierMap, asset.export),
      ]);

      switch (type) {
        case DependencyType.WebWorker: {
          break;
        }
        case DependencyType.Import:
        case DependencyType.DynamicImport:
        case DependencyType.Fetch: {
          let statmentNode: ts.ExportAssignment | ts.VariableStatement;
          if (input === bundleInput) {
            // default export (async () => { … })();
            statmentNode = createDefaultExportAssignment(iifeNode);
          } else {
            const identifier = getIdentifier(importIdentifierMap, input);
            // const mod = (async () => { … })();
            statmentNode = factory.createVariableStatement(
              undefined,
              factory.createVariableDeclarationList(
                [factory.createVariableDeclaration(
                  factory.createIdentifier(identifier),
                  undefined,
                  undefined,
                  iifeNode,
                )],
                ts.NodeFlags.Const,
              ),
            );
          }

          newSourceFile = factory.createSourceFile(
            [statmentNode],
            factory.createToken(ts.SyntaxKind.EndOfFileToken),
            ts.NodeFlags.None,
          );
          break;
        }
      }

      break;
    }
    case Format.Style: {
      const rootInput = history.length - 1;
      const source = await bundler.transformSource(
        /* get initial file to set corrent relative css paths */
        history[rootInput],
        dependencyItem,
        context,
      ) as string;
      // `#a { … }`
      const sourceNode = factory
        .createNoSubstitutionTemplateLiteral(
          source,
          source,
        );

      // const _default = `#a { … };`
      const statement: ts.Statement = factory.createVariableStatement(
        undefined,
        factory.createVariableDeclarationList(
          [factory.createVariableDeclaration(
            factory.createIdentifier(defaultIdentifier),
            undefined,
            undefined,
            sourceNode,
          )],
          ts.NodeFlags.Const,
        ),
      );

      // (async () => { const _default = `#a { … }`; return { default: _default }; })();
      const iifeExpression = createIIFEExpression([
        statement,
        createReturnStatement(identifierMap, importIdentifierMap, {
          default: true,
        }),
      ]);

      const identifier = getIdentifier(importIdentifierMap, input);
      // const mod = (async () => { const _default = `#a { … }`; return { default: _default }; })();
      const modStatement = factory.createVariableStatement(
        undefined,
        factory.createVariableDeclarationList(
          [factory.createVariableDeclaration(
            factory.createIdentifier(identifier),
            undefined,
            undefined,
            iifeExpression,
          )],
          ts.NodeFlags.Const,
        ),
      );
      newSourceFile = factory.createSourceFile(
        [modStatement],
        factory.createToken(ts.SyntaxKind.EndOfFileToken),
        ts.NodeFlags.None,
      );
      break;
    }
    case Format.Json: {
      let source = await bundler.transformSource(
        bundleInput,
        dependencyItem,
        context,
      ) as string;

      if (context.optimize) {
        source = JSON.stringify(JSON.parse(source));
      }
      // `{ … }`
      const sourceNode = factory
        .createNoSubstitutionTemplateLiteral(
          source,
          source,
        );

      // const _default = `{ … };`
      const statement: ts.Statement = factory.createVariableStatement(
        undefined,
        factory.createVariableDeclarationList(
          [factory.createVariableDeclaration(
            factory.createIdentifier(defaultIdentifier),
            undefined,
            undefined,
            sourceNode,
          )],
          ts.NodeFlags.Const,
        ),
      );
      // (async () => { const _default = `{ … }`; return { default: _default }; })();
      const iifeExpression = createIIFEExpression([
        statement,
        createReturnStatement(identifierMap, importIdentifierMap, {
          default: true,
        }),
      ]);
      const identifier = getIdentifier(importIdentifierMap, input);
      // const mod = (async () => { const _default = `{ … }`; return { default: _default }; })();
      const modStatement = factory.createVariableStatement(
        undefined,
        factory.createVariableDeclarationList(
          [factory.createVariableDeclaration(
            factory.createIdentifier(identifier),
            undefined,
            undefined,
            iifeExpression,
          )],
          ts.NodeFlags.Const,
        ),
      );
      newSourceFile = factory.createSourceFile(
        [modStatement],
        factory.createToken(ts.SyntaxKind.EndOfFileToken),
        ts.NodeFlags.None,
      );
      break;
    }
  }

  if (!newSourceFile) {
    throw new Error(
      `error during bundling '${bundleInput}': source file is invalid: '${input}'`,
    );
  }

  logger.trace(
    colors.dim(`→`),
    "Transform",
    colors.dim(input),
    colors.dim(colors.italic(`(${timestamp(transformTime)})`)),
  );

  const printTime = performance.now();

  const source = printer.printFile(newSourceFile);

  const commentedSource = `/* ${input} */\n${source}`;

  logger.trace(
    colors.dim(`→`),
    "Print",
    colors.dim(input),
    colors.dim(colors.italic(`(${timestamp(printTime)})`)),
  );

  await bundler.setCache(
    bundleInput,
    input,
    commentedSource,
    context,
  );
  return commentedSource;
}

/**
 * create import statements from importItems
 * ```ts
 * import { … } from "./x.ts";
 * import { … } from "./y.ts";
 * ```
 */
function createImportSources(
  bundleOutput: string,
  importItems: Item[],
  importIdentifierMap: IdentifierMap,
  context: Context,
) {
  const { graph } = context;
  const importNodes = importItems.map((importItem) => {
    const { history, type } = importItem;
    const input = history[0];
    const identifier = getIdentifier(importIdentifierMap, input);
    const asset = getAsset(graph, input, type);
    const relativeOutput = addRelativePrefix(
      path.relative(path.dirname(bundleOutput), asset.output),
    );
    return factory.createImportDeclaration(
      undefined,
      undefined,
      factory.createImportClause(
        false,
        factory.createIdentifier(identifier),
        undefined,
      ),
      factory.createStringLiteral(relativeOutput),
    );
  });

  const sourceFile = factory.createSourceFile(
    importNodes,
    ts.createToken(ts.SyntaxKind.EndOfFileToken),
    ts.NodeFlags.None,
  );

  return printer.printFile(sourceFile);
}

/**
 * prepends
 * ```ts
 * export default …
 * ```
 * to expression
 */
function createDefaultExportAssignment(expression: ts.Expression) {
  return factory.createExportAssignment(
    undefined,
    undefined,
    undefined,
    expression,
  );
}

/**
 * create return statement
 * ```ts
 * return { … }
 * ```
 */
const defaultIdentifier = "_default";

function createReturnStatement(
  identifierMap: IdentifierMap,
  importIdentifierMap: IdentifierMap,
  _export: Export,
) {
  const {
    specifiers,
  } = _export;
  const propertyAssignments = [];
  const propertySpecifierEntries: [string, string][] = [];

  if (_export.default) {
    propertySpecifierEntries.push([defaultKeyword, defaultIdentifier]);
  }
  if (specifiers) {
    propertySpecifierEntries.push(...Object.entries(specifiers));
  }

  propertyAssignments.push(
    ...propertySpecifierEntries.map(([key, value]) => {
      if (identifierMap.has(value)) {
        value = identifierMap.get(value) as string;
      }
      if (key === value) {
        return factory.createShorthandPropertyAssignment(
          factory.createIdentifier(value),
          undefined,
        );
      } else {
        return factory.createPropertyAssignment(
          factory.createIdentifier(key),
          factory.createIdentifier(value),
        );
      }
    }),
  );

  // add `...await mod` for namespaces
  if (_export.namespaces) {
    propertyAssignments.push(..._export.namespaces.map((dependency) => {
      const identifier = importIdentifierMap.get(dependency)!;
      return factory.createSpreadAssignment(
        factory.createAwaitExpression(factory.createIdentifier(identifier)),
      );
    }));
  }

  return factory.createReturnStatement(
    factory.createObjectLiteralExpression(
      propertyAssignments,
      false,
    ),
  );
}
/**
 * create iife expression
 * ```ts
 * (async () => { … })();
 * ```
 */
function createIIFEExpression(
  statements: ts.Statement[],
) {
  return factory.createCallExpression(
    factory.createParenthesizedExpression(factory.createArrowFunction(
      [factory.createModifier(ts.SyntaxKind.AsyncKeyword)],
      undefined,
      [],
      undefined,
      factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
      factory.createBlock(
        statements,
        true,
      ),
    )),
    undefined,
    [],
  );
}

function transpile(
  source: string,
  compilerOptions: Deno.CompilerOptions,
) {
  // const name = "/x.tsx";
  // const { files, diagnostics } = await Deno.emit(name, {
  //   sources: {
  //     [name]: source,
  //   },
  //   compilerOptions: {
  //     target: "esnext",
  //     module: "esnext",
  //     strict: false,
  //     ...compilerOptions,
  //   },
  //   check: false,
  // });
  // if (diagnostics.length) {
  //   throw Error(diagnostics[0].messageText)
  // }
  // return files[`file://${name}.js`];

  const tsCompilerOptions =
    ts.convertCompilerOptionsFromJson({ compilerOptions }, Deno.cwd()).options;
  return ts.transpile(source, {
    jsxFactory: "React.createElement",
    jsxFragmentFactory: "React.Fragment",
    jsx: ts.JsxEmit.React,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    ...tsCompilerOptions,
  });
}

export class TypescriptTopLevelAwaitModulePlugin extends TypescriptPlugin {
  async createBundle(bundleChunk: Chunk, context: Context) {
    const { graph, bundler, logger } = context;
    const bundleItem = bundleChunk.item;
    const bundleInput = bundleItem.history[0];
    const bundleAsset = getAsset(graph, bundleInput, bundleItem.type);

    bundler.logger.debug(colors.yellow("Bundle"), bundleInput);

    const dependencyItems = [...bundleChunk.dependencyItems];

    // split dependency items into imports and inlines
    const { importItems, inlineItems } = await splitDependencyItems(
      dependencyItems,
      context,
    );
    const importIdentifierMap = createImportIdentifierMap(
      graph,
      dependencyItems,
    );

    // add bundleItem to be inlined
    inlineItems.push(bundleItem);

    // get all items that need an update
    const updateItems = await createUpdateItems(
      bundleInput,
      [...inlineItems, bundleItem],
      context,
    );

    if (!updateItems.length && await fs.exists(bundleAsset.output)) {
      // return undefined if no update is needed
      return;
    }

    // sort inline items
    const sortedInlineItems = topologicalSort(
      inlineItems,
      graph,
    );

    const blacklistIdentifiers = new Set(
      [
        ...importIdentifierMap.values(),
      ],
    );
    const identifiers: Set<string> = new Set();

    // extract identifiers from all inlineItems
    await Promise.all(sortedInlineItems.map(async (dependencyItem) => {
      const sourceFile = await bundler.readSource(
        dependencyItem,
        context,
      ) as ts.SourceFile;
      extractIdentifiersFromSourceFile(sourceFile).forEach((identifier) =>
        identifiers.add(identifier)
      );
    }));

    const identifierMap = createIdentifierMap(
      identifiers,
      blacklistIdentifiers,
      new Map([[defaultKeyword, defaultIdentifier]]),
    );

    const inlineSources = await createInlineSources(
      bundleItem,
      sortedInlineItems,
      updateItems,
      identifierMap,
      importIdentifierMap,
      context,
    );

    const importSources = createImportSources(
      bundleAsset.output,
      importItems,
      importIdentifierMap,
      context,
    );

    const moduleString = [importSources, inlineSources].join("\n");

    const transpileTime = performance.now();
    const transpiledSource = await transpile(
      moduleString,
      this.compilerOptions,
    );

    logger.trace(
      colors.dim(`→`),
      "Transpile",
      colors.dim(bundleInput),
      colors.dim(colors.italic(`(${timestamp(transpileTime)})`)),
    );

    return transpiledSource;
  }
}
