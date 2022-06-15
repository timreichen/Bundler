import {
  colors,
  ImportMap,
  resolveModuleSpecifier as resolveImportMapModuleSpecifier,
  ts,
} from "../../../../deps.ts";
import { Chunk, DependencyFormat, DependencyType } from "../../../plugin.ts";
import {
  createRelativeOutput,
  getChunk,
  getDependencyFormat,
  resolveModuleSpecifier,
} from "../../../_util.ts";
import { injectIdentifiersTransformer } from "../identifiers/inject_identifiers.ts";
import { removeModifiersTransformer } from "../modifiers/remove_modifiers.ts";
import {
  createExportDeclaration,
  getDepdendencyFormatFromAssertClause,
  getDepdendencyFormatFromAssertType,
} from "./_util.ts";
import { createNextIdentifier } from "../_util.ts";
import { ConsoleLogger } from "../../../../log/console_logger.ts";

export interface InjectDependenciesContext {
  root: string;
  chunks: Chunk[];
  logger: ConsoleLogger;
  importMap?: ImportMap;
  compilerOptions?: ts.CompilerOptions;
}

function getModName(
  modNameMap: Record<string, string>,
  name: string,
  blacklistIdentifiers: Set<string>,
) {
  if (!modNameMap[name]) {
    const newModName = createNextIdentifier("mod", blacklistIdentifiers);
    modNameMap[name] = newModName;
  }
  return modNameMap[name];
}

function transform(
  sourceFile: ts.SourceFile,
  transfomers: ts.TransformerFactory<ts.SourceFile>[],
  compilerOptions?: ts.CompilerOptions,
) {
  const { transformed } = ts.transform(
    sourceFile,
    transfomers,
    compilerOptions,
  );
  return transformed[0];
}

// replace import moduleSpecifier with chunk output
function updateImportSpecifier(
  node: ts.ImportDeclaration,
  resolvedModuleSpecifier: string,
  { root, chunks, logger }: InjectDependenciesContext,
) {
  const format = getDependencyFormat(resolvedModuleSpecifier) ||
    DependencyFormat.Script;

  const chunk = getChunk(
    chunks,
    resolvedModuleSpecifier,
    DependencyType.ImportExport,
    format,
  );

  const relativeOutput = createRelativeOutput(chunk.output, root);
  logger.trace(
    colors.yellow("Update Import Specifier"),
    (node.moduleSpecifier as ts.StringLiteral).text,
    colors.dim("→"),
    relativeOutput,
  );

  return ts.factory.updateImportDeclaration(
    node,
    node.decorators,
    node.modifiers,
    node.importClause,
    ts.factory.createStringLiteral(relativeOutput),
    node.assertClause,
  );
}

// replace export moduleSpecifier with chunk output
function updateExportSpecifier(
  node: ts.ExportDeclaration,
  resolvedModuleSpecifier: string,
  { root, chunks, logger }: InjectDependenciesContext,
) {
  const format = getDependencyFormat(resolvedModuleSpecifier) ||
    DependencyFormat.Script;
  const chunk = getChunk(
    chunks,
    resolvedModuleSpecifier,
    DependencyType.ImportExport,
    format,
  );

  const relativeOutput = createRelativeOutput(chunk.output, root);
  logger.trace(
    "→",
    colors.yellow("Update Export Specifier"),
    (node.moduleSpecifier as ts.StringLiteral).text,
    "→",
    relativeOutput,
  );
  return ts.factory.updateExportDeclaration(
    node,
    node.decorators,
    node.modifiers,
    node.isTypeOnly,
    node.exportClause,
    ts.factory.createStringLiteral(
      relativeOutput,
    ),
    node.assertClause,
  );
}

// replace fetch(path) path with chunk output
function updateFetchExpression(
  node: ts.CallExpression,
  resolvedModuleSpecifier: string,
  { chunks, root }: InjectDependenciesContext,
) {
  const format = getDependencyFormat(resolvedModuleSpecifier) ||
    DependencyFormat.Script;

  const chunk = getChunk(
    chunks,
    resolvedModuleSpecifier,
    DependencyType.Fetch,
    format,
  );

  const args = [...node.arguments];
  args.splice(
    0,
    1,
    ts.factory.createStringLiteral(
      createRelativeOutput(chunk.output, root),
    ),
  );
  return ts.factory.updateCallExpression(
    node,
    node.expression,
    node.typeArguments,
    args,
  );
}
// replace import(path) path with chunk output
function updateDynamicImportExpression(
  node: ts.CallExpression,
  resolvedModuleSpecifier: string,
  { chunks, root }: InjectDependenciesContext,
) {
  let format = DependencyFormat.Script;

  const assertion = node.arguments[1];
  if (assertion && ts.isObjectLiteralExpression(assertion)) {
    const assertProperty = assertion.properties.find((property) =>
      property.name && ts.isIdentifier(property.name) &&
      property.name.text === "assert"
    );
    if (assertProperty && ts.isPropertyAssignment(assertProperty)) {
      if (ts.isObjectLiteralExpression(assertProperty.initializer)) {
        const typeProperty = assertProperty.initializer.properties
          .find((property) =>
            property.name && ts.isIdentifier(property.name) &&
            property.name.text === "type"
          );
        if (typeProperty && ts.isPropertyAssignment(typeProperty)) {
          if (ts.isStringLiteral(typeProperty.initializer)) {
            const typeName = typeProperty.initializer.text;
            format = getDepdendencyFormatFromAssertType(typeName);
          }
        }
      }
    }
  }
  const chunk = getChunk(
    chunks,
    resolvedModuleSpecifier,
    DependencyType.DynamicImport,
    format,
  );

  const args = [...node.arguments];
  args.splice(
    0,
    1,
    ts.factory.createStringLiteral(
      createRelativeOutput(chunk.output, root),
    ),
  );
  return ts.factory.updateCallExpression(
    node,
    node.expression,
    node.typeArguments,
    args,
  );
}
// replace serviceWorker.register(path) path with chunk output
function updateServiceWorkerExpression(
  node: ts.CallExpression,
  resolvedModuleSpecifier: string,
  { chunks, root }: InjectDependenciesContext,
) {
  const chunk = getChunk(
    chunks,
    resolvedModuleSpecifier,
    DependencyType.ServiceWorker,
    DependencyFormat.Script,
  );
  const args = [...node.arguments];
  args.splice(
    0,
    1,
    ts.factory.createStringLiteral(
      createRelativeOutput(chunk.output, root),
    ),
  );
  return ts.factory.updateCallExpression(
    node,
    node.expression,
    node.typeArguments,
    args,
  );
}
// replace new Worker(path) path with chunk output
function updateWebWorkerExpression(
  node: ts.NewExpression,
  resolvedModuleSpecifier: string,
  { chunks, root }: InjectDependenciesContext,
) {
  const chunk = getChunk(
    chunks,
    resolvedModuleSpecifier,
    DependencyType.WebWorker,
    DependencyFormat.Script,
  );

  const args = [...node.arguments!];
  args.splice(
    0,
    1,
    ts.factory.createStringLiteral(
      createRelativeOutput(chunk.output, root),
    ),
  );
  return ts.factory.updateNewExpression(
    node,
    node.expression,
    node.typeArguments,
    args,
  );
}

function createInlineStyleVariableDeclaration(name: string, source: string) {
  return [
    ts.factory.createVariableStatement(
      undefined,
      ts.factory.createVariableDeclarationList(
        [ts.factory.createVariableDeclaration(
          ts.factory.createIdentifier(name),
          undefined,
          undefined,
          ts.factory.createNewExpression(
            ts.factory.createIdentifier(
              "CSSStyleSheet",
            ),
            undefined,
            [],
          ),
        )],
        ts.NodeFlags.Const,
      ),
    ),
    ts.factory.createExpressionStatement(
      ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
          ts.factory.createIdentifier(name),
          ts.factory.createIdentifier("replaceSync"),
        ),
        undefined,
        [ts.factory.createNoSubstitutionTemplateLiteral(
          source,
          source,
        )],
      ),
    ),
  ];
}

function createInlineJsonVariableDeclaration(name: string, source: string) {
  return ts.factory.createVariableStatement(
    undefined,
    ts.factory.createVariableDeclarationList(
      [ts.factory.createVariableDeclaration(
        ts.factory.createIdentifier(name),
        undefined,
        undefined,
        ts.factory.createCallExpression(
          ts.factory.createPropertyAccessExpression(
            ts.factory.createIdentifier("JSON"),
            ts.factory.createIdentifier("parse"),
          ),
          undefined,
          [ts.factory
            .createNoSubstitutionTemplateLiteral(
              source,
              source,
            )],
        ),
      )],
      ts.NodeFlags.Const,
    ),
  );
}

function createModVariableDeclaration(
  modName: string,
  exportMap: Record<string, string>,
) {
  const propertyAssignments = Object.entries(exportMap)
    .map(([key, value]) => {
      if (key === value) {
        return ts.factory
          .createShorthandPropertyAssignment(
            ts.factory.createIdentifier(key),
            undefined,
          );
      } else {
        return ts.factory.createPropertyAssignment(
          ts.factory.createIdentifier(key),
          ts.factory.createIdentifier(value),
        );
      }
    });
  return ts.factory.createVariableStatement(
    undefined,
    ts.factory.createVariableDeclarationList(
      [ts.factory.createVariableDeclaration(
        ts.factory.createIdentifier(modName),
        undefined,
        undefined,
        ts.factory.createObjectLiteralExpression(
          propertyAssignments,
          false,
        ),
      )],
      ts.NodeFlags.Const,
    ),
  );
}

interface DependencyMod {
  statements: ts.Statement[];
  exportMap: Record<string, string>;
  injectIdentifiers: Map<string, string>;
}

export function injectDependenciesFromSourceFile(
  sourceFile: ts.SourceFile,
  chunk: Chunk,
  context: InjectDependenciesContext,
) {
  function resolveSpecifier(
    filePath: string,
    moduleSpecifier: string,
    importMap?: ImportMap,
  ) {
    let resolvedModuleSpecifier = moduleSpecifier;

    if (importMap) {
      resolvedModuleSpecifier = resolveImportMapModuleSpecifier(
        moduleSpecifier,
        importMap,
        new URL(filePath, "file://"),
      );
    }

    resolvedModuleSpecifier = resolveModuleSpecifier(
      filePath,
      resolvedModuleSpecifier,
    );

    return resolvedModuleSpecifier;
  }

  const importExportStatements: ts.Statement[] = [];
  const dependencyMods: Record<string, DependencyMod> = {};

  const blacklistIdentifiers: Set<string> = new Set();
  const modNameMap: Record<string, string> = {};
  const exportMap: Record<string, string> = {};

  function inject(
    sourceFile: ts.SourceFile,
    exportMap: Record<string, string>,
  ) {
    const statements: ts.Statement[] = [];
    const injectIdentifiers: Map<string, string> = new Map();

    const result = transform(sourceFile, [
      (transformationContext: ts.TransformationContext) => {
        return (sourceFile: ts.SourceFile) => {
          const visitor: ts.Visitor = (node: ts.Node) => {
            if (
              ts.isImportDeclaration(node) &&
              ts.isStringLiteral(node.moduleSpecifier)
            ) {
              const moduleSpecifier = node.moduleSpecifier.text;
              const resolvedModuleSpecifier = resolveSpecifier(
                sourceFile.fileName,
                moduleSpecifier,
                context.importMap,
              );

              const format = node.assertClause &&
                  getDepdendencyFormatFromAssertClause(node.assertClause) ||
                DependencyFormat.Script;

              const dependencyItem = chunk.dependencyItems.find((item) =>
                item.input === resolvedModuleSpecifier &&
                item.type === DependencyType.ImportExport &&
                format === format
              );

              if (dependencyItem) {
                const importClause = node.importClause;
                if (importClause && importClause.name) {
                  // import name from "./x.ts"
                  const name = importClause.name.text;
                  const source = dependencyItem.source as string;
                  switch (format) {
                    case DependencyFormat.Style: {
                      return createInlineStyleVariableDeclaration(
                        name,
                        source,
                      );
                    }
                    case DependencyFormat.Json: {
                      return createInlineJsonVariableDeclaration(
                        name,
                        source,
                      );
                    }
                  }
                }

                if (!dependencyMods[dependencyItem.input]) {
                  const dependencySourceFile = ts.createSourceFile(
                    dependencyItem.input,
                    dependencyItem.source as string,
                    ts.ScriptTarget.ESNext,
                  );

                  const _exportMap: Record<string, string> = {};
                  const injectResult = inject(
                    dependencySourceFile,
                    _exportMap,
                  );

                  dependencyMods[dependencyItem.input] = injectResult;
                }

                const injectResult = dependencyMods[dependencyItem.input];

                if (importClause && importClause.name) {
                  // import name from "./x.ts"
                  const name = importClause.name.text;
                  injectIdentifiers.set(
                    name,
                    injectResult.exportMap["default"],
                  );
                }

                const namedBindings = importClause?.namedBindings;
                if (namedBindings) {
                  if (ts.isNamedImports(namedBindings)) {
                    // import { name as propertyName } from "./x.ts"
                    for (const element of namedBindings.elements) {
                      const name = element.name.text;
                      const propertyName = element.propertyName?.text;
                      if (propertyName) {
                        const exportName = injectResult.exportMap[propertyName];
                        const value = exportName ||
                          propertyName;
                        injectIdentifiers.set(name, value);
                      } else {
                        const exportName = injectResult.exportMap[name];
                        if (exportName) {
                          injectIdentifiers.set(name, exportName);
                        }
                      }
                      // forward identifier if export is alias and import is alias
                      const value = injectIdentifiers.get(name);
                      const alias = value
                        ? injectResult.injectIdentifiers.get(
                          value,
                        )
                        : false;
                      if (alias) {
                        injectIdentifiers.set(name, alias);
                      }
                    }
                  } else if (ts.isNamespaceImport(namedBindings)) {
                    // import * as name from "./x.ts"
                    const name = namedBindings.name.text;

                    const modName = getModName(
                      modNameMap,
                      dependencyItem.input,
                      blacklistIdentifiers,
                    );

                    blacklistIdentifiers.add(modName);

                    injectIdentifiers.set(name, modName);

                    const nextIdentifier = createNextIdentifier(
                      modName,
                      blacklistIdentifiers,
                    );
                    injectIdentifiers.set(modName, nextIdentifier);
                    const modVariableDeclaration = createModVariableDeclaration(
                      modName,
                      injectResult.exportMap,
                    );

                    dependencyMods[dependencyItem.input].statements.push(
                      modVariableDeclaration,
                    );
                  }
                }

                return;
              } else {
                const importClause = node.importClause;
                if (importClause && importClause.isTypeOnly) return;
                const statement = updateImportSpecifier(
                  node,
                  resolvedModuleSpecifier,
                  context,
                );
                importExportStatements.push(statement);
                return;
              }
            } else if (
              ts.isExportDeclaration(node) &&
              node.moduleSpecifier &&
              ts.isStringLiteral(node.moduleSpecifier)
            ) {
              const moduleSpecifier = node.moduleSpecifier.text;

              const resolvedModuleSpecifier = resolveSpecifier(
                sourceFile.fileName,
                moduleSpecifier,
                context.importMap,
              );

              const format = node.assertClause &&
                  getDepdendencyFormatFromAssertClause(node.assertClause) ||
                DependencyFormat.Script;
              const dependencyItem = chunk.dependencyItems.find((item) =>
                item.input === resolvedModuleSpecifier &&
                item.type === DependencyType.ImportExport &&
                format === format
              );

              if (dependencyItem) {
                if (!dependencyMods[dependencyItem.input]) {
                  const dependencySourceFile = ts.createSourceFile(
                    dependencyItem.input,
                    dependencyItem.source as string,
                    ts.ScriptTarget.ESNext,
                  );

                  const newExportMap: Record<string, string> = {};

                  const injectResult = inject(
                    dependencySourceFile,
                    newExportMap,
                  );

                  dependencyMods[dependencyItem.input] = injectResult;
                }

                const injectResult = dependencyMods[dependencyItem.input];

                const exportClause = node.exportClause;
                if (exportClause) {
                  if (ts.isNamedExports(exportClause)) {
                    // export { name as propertyName } from "./x.ts"
                    for (const element of exportClause.elements) {
                      const name = element.name.text;
                      const propertyName = element.propertyName?.text;
                      if (propertyName) {
                        const exportName = injectResult.exportMap[propertyName];
                        const value = exportName ||
                          propertyName;

                        exportMap[name] = injectIdentifiers.get(value) || value;

                        injectIdentifiers.set(name, exportMap[name]);

                        if (propertyName !== value) {
                          const nextIdentifier = createNextIdentifier(
                            value,
                            blacklistIdentifiers,
                          );
                          injectIdentifiers.set(value, nextIdentifier);
                        }
                      } else {
                        const value = injectResult.exportMap[name];
                        exportMap[name] = injectIdentifiers.get(value) || value;

                        if (value) {
                          injectIdentifiers.set(name, exportMap[name]);
                        }
                      }
                    }
                  } else if (ts.isNamespaceExport(exportClause)) {
                    // export * as name from "./x.ts"
                    const name = exportClause.name.text;

                    const modName = getModName(
                      modNameMap,
                      dependencyItem.input,
                      blacklistIdentifiers,
                    );

                    blacklistIdentifiers.add(modName);

                    injectIdentifiers.set(name, modName);

                    exportMap[name] = modName;

                    const modVariableDeclaration = createModVariableDeclaration(
                      modName,
                      injectResult.exportMap,
                    );

                    dependencyMods[dependencyItem.input].statements.push(
                      modVariableDeclaration,
                    );
                  }
                } else {
                  // export * from "./x.ts"
                  for (
                    const [key, value] of Object.entries(
                      injectResult.exportMap,
                    )
                  ) {
                    exportMap[key] =
                      injectResult.injectIdentifiers.get(value) ||
                      value;
                  }
                }

                return;
              } else {
                if (node.isTypeOnly) return;
                const statement = updateExportSpecifier(
                  node,
                  resolvedModuleSpecifier,
                  context,
                );
                importExportStatements.push(statement);
                return;
              }
            } else if (
              ts.isCallExpression(node)
            ) {
              if (
                ts.isIdentifier(node.expression) &&
                node.expression.text === "fetch" &&
                ts.isStringLiteral(node.arguments?.[0])
              ) {
                const moduleSpecifier = node.arguments[0].text;
                const resolvedModuleSpecifier = resolveModuleSpecifier(
                  sourceFile.fileName,
                  moduleSpecifier,
                );
                return updateFetchExpression(
                  node,
                  resolvedModuleSpecifier,
                  context,
                );
              } else if (
                node.expression.kind === ts.SyntaxKind.ImportKeyword &&
                ts.isStringLiteral(node.arguments?.[0])
              ) {
                const moduleSpecifier = node.arguments?.[0].text;
                const resolvedModuleSpecifier = resolveModuleSpecifier(
                  sourceFile.fileName,
                  moduleSpecifier,
                );
                return updateDynamicImportExpression(
                  node,
                  resolvedModuleSpecifier,
                  context,
                );
              } else if (
                ts.isPropertyAccessExpression(node.expression) &&
                node.expression.name.text === "register" &&
                ts.isPropertyAccessExpression(node.expression.expression) &&
                node.expression.expression.name.text === "serviceWorker"
              ) {
                const argument = node.arguments?.[0];
                if (argument && ts.isStringLiteral(argument)) {
                  const moduleSpecifier = argument.text;
                  const resolvedModuleSpecifier = resolveModuleSpecifier(
                    sourceFile.fileName,
                    moduleSpecifier,
                  );
                  return updateServiceWorkerExpression(
                    node,
                    resolvedModuleSpecifier,
                    context,
                  );
                }
              }
            } else if (
              ts.isNewExpression(node) && ts.isIdentifier(node.expression) &&
              node.expression.text === "Worker"
            ) {
              const argument = node.arguments?.[0];
              if (argument && ts.isStringLiteral(argument)) {
                const moduleSpecifier = argument.text;
                const resolvedModuleSpecifier = resolveModuleSpecifier(
                  sourceFile.fileName,
                  moduleSpecifier,
                );
                return updateWebWorkerExpression(
                  node,
                  resolvedModuleSpecifier,
                  context,
                );
              }
            }
            return ts.visitEachChild(node, visitor, transformationContext);
          };

          return ts.visitNode(sourceFile, visitor);
        };
      },
      removeModifiersTransformer(exportMap, blacklistIdentifiers),
      injectIdentifiersTransformer(injectIdentifiers, blacklistIdentifiers),
    ], context.compilerOptions);

    statements.push(...result.statements);

    // if (statements[0]) {
    //   ts.addSyntheticLeadingComment(
    //     statements[0],
    //     ts.SyntaxKind.MultiLineCommentTrivia,
    //     ` ${sourceFile.fileName} `,
    //     true,
    //   );
    // }

    return {
      statements,
      exportMap,
      injectIdentifiers,
    };
  }

  const injectResult = inject(sourceFile, exportMap);

  const modStatements = [...injectResult.statements];

  if (Object.keys(exportMap).length) {
    modStatements.push(
      createExportDeclaration(exportMap),
    );
  }

  const printer: ts.Printer = ts.createPrinter({
    removeComments: false,
    newLine: context.compilerOptions?.newLine,
  });

  return printer.printFile(
    ts.factory.createSourceFile(
      [
        ...importExportStatements,
        ...Object.values(dependencyMods).map((dependencyMod) =>
          dependencyMod.statements
        ).flat(),
        ...modStatements,
      ],
      ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
      ts.NodeFlags.None,
    ),
  );
}

export function injectDependencies(
  chunk: Chunk,
  context: InjectDependenciesContext,
) {
  const sourceFile = ts.createSourceFile(
    chunk.item.input,
    chunk.item.source as string,
    ts.ScriptTarget.ESNext,
  );
  return injectDependenciesFromSourceFile(
    sourceFile,
    chunk,
    context,
  );
}
