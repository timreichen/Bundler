import { fs, path, Sha256, ts } from "../../deps.ts";
import { addRelativePrefix, isURL } from "../../_util.ts";
import { Chunk, Context, DependencyType, Format } from "../plugin.ts";
import { TypescriptPlugin } from "./typescript.ts";
import { cache, resolve as resolveCache } from "../../cache.ts";
import { getAsset } from "../../graph.ts";
import { typescriptInjectDependenciesTranformer } from "./transformers/inject_dependencies.ts";
import { typescriptInjectInstanceNameTransformer } from "./transformers/inject_instance_name.ts";

function createSystemInstantiate(input: string, hasSpecifiers: boolean) {
  const expression = ts.factory.createCallExpression(
    ts.factory.createIdentifier("__instantiate"),
    undefined,
    [
      ts.factory.createStringLiteral(input),
      ts.factory.createFalse(),
    ],
  );

  if (hasSpecifiers) {
    return ts.factory.createVariableStatement(
      undefined,
      ts.factory.createVariableDeclarationList(
        [ts.factory.createVariableDeclaration(
          ts.factory.createIdentifier("__exp"),
          undefined,
          undefined,
          expression,
        )],
        ts.NodeFlags.Const,
      ),
    );
  }
  return expression;
}
function exportString(key: string, value: string) {
  return ts.factory.createVariableStatement(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createVariableDeclarationList(
      [ts.factory.createVariableDeclaration(
        ts.factory.createIdentifier(key),
        undefined,
        undefined,
        ts.factory.createElementAccessExpression(
          ts.factory.createIdentifier("__exp"),
          ts.factory.createStringLiteral(value),
        ),
      )],
      ts.NodeFlags.Const,
    ),
  );
}
function defaultExportString(value: string) {
  return ts.factory.createElementAccessExpression(
    ts.factory.createIdentifier("__exp"),
    ts.factory.createStringLiteral(value),
  );
}
export function createSystemExports(exportSpecifiers: string[]) {
  const strings: ts.Node[] = [];
  for (const key of exportSpecifiers) {
    if (key === "default") {
      strings.push(defaultExportString(key));
    } else {
      strings.push(exportString(key, key));
    }
  }

  return ts.factory.createNodeArray(strings);
}
function createModuleImport(
  specifier: string,
  filePath: string,
) {
  return ts.factory.createImportDeclaration(
    undefined,
    undefined,
    ts.factory.createImportClause(
      false,
      undefined,
      ts.factory.createNamespaceImport(ts.factory.createIdentifier(specifier)),
    ),
    ts.factory.createStringLiteral(filePath),
  );
}
function injectBundleImportSpecifiers(
  input: string,
  source: string,
  specifiers: Record<string, string>,
): string {
  const sourceFile = ts.createSourceFile(
    input,
    source,
    ts.ScriptTarget.Latest,
  );
  const result = ts.transform(
    sourceFile,
    [bundleImportTransformer(specifiers)],
  );

  return printer.printNode(
    ts.EmitHint.SourceFile,
    result.transformed[0],
    sourceFile,
  );
}
function bundleImportTransformer(specifiers: Record<string, string>) {
  return (context: ts.TransformationContext) => {
    const dependencies: string[] = [];
    const visit: ts.Visitor = (node: ts.Node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.escapedText === "System" &&
        node.expression.name.escapedText === "register"
      ) {
        return ts.visitEachChild(node, (node: ts.Node) => {
          if (ts.isArrayLiteralExpression(node)) {
            return ts.visitEachChild(node, (node: ts.Node) => {
              if (ts.isStringLiteral(node)) {
                dependencies.push(node.text);
              }
              return node;
            }, context);
          }

          if (ts.isFunctionExpression(node)) {
            return ts.visitEachChild(node, (node: ts.Node) => {
              if (ts.isBlock(node)) {
                return ts.visitEachChild(node, (node: ts.Node) => {
                  if (ts.isReturnStatement(node)) {
                    return ts.visitEachChild(node, (node: ts.Node) => {
                      if (ts.isObjectLiteralExpression(node)) {
                        return ts.visitEachChild(node, (node: ts.Node) => {
                          if (ts.isPropertyAssignment(node)) {
                            if (
                              ts.isIdentifier(node.name) &&
                              node.name.escapedText === "setters"
                            ) {
                              return ts.visitEachChild(
                                node,
                                (node: ts.Node) => {
                                  if (ts.isArrayLiteralExpression(node)) {
                                    const elements = node.elements;
                                    return ts.visitEachChild(
                                      node,
                                      (node: ts.Node) => {
                                        const index = elements.indexOf(
                                          node as ts.Expression,
                                        );
                                        if (ts.isFunctionExpression(node)) {
                                          return ts.visitEachChild(
                                            node,
                                            (node: ts.Node) => {
                                              if (ts.isParameter(node)) {
                                                const dependency =
                                                  dependencies[index];
                                                const specifier =
                                                  specifiers[dependency];
                                                if (specifier) {
                                                  return context.factory
                                                    .createParameterDeclaration(
                                                      undefined,
                                                      undefined,
                                                      undefined,
                                                      context.factory
                                                        .createIdentifier(
                                                          (node
                                                            .name as ts.Identifier)
                                                            .text,
                                                        ),
                                                      undefined,
                                                      undefined,
                                                      context.factory
                                                        .createIdentifier(
                                                          specifier,
                                                        ),
                                                    );
                                                }
                                              }
                                              return node;
                                            },
                                            context,
                                          );
                                        }
                                        return node;
                                      },
                                      context,
                                    );
                                  }
                                  return node;
                                },
                                context,
                              );
                            }
                          }
                          return node;
                        }, context);
                      }
                      return node;
                    }, context);
                  }
                  return node;
                }, context);
              }
              return node;
            }, context);
          }
          return node;
        }, context);
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (node: ts.Node) => {
      return ts.visitNode(node, visit);
    };
  };
}

function createDefaultExport(
  sourceFile: ts.SourceFile,
  node: ts.Expression,
) {
  const defaultExport = ts.factory.createExportAssignment(
    undefined,
    undefined,
    undefined,
    node,
  );

  return printer.printNode(
    ts.EmitHint.Unspecified,
    defaultExport,
    sourceFile,
  );
}

const systemLoader =
  `// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.

  // This is a specialised implementation of a System module loader.

  "use strict";

  // @ts-nocheck
  /* eslint-disable */
  let System, __instantiate;
  (() => {
    const r = new Map();

    System = {
      register(id, d, f) {
        r.set(id, { d, f, exp: {} });
      },
    };
    async function dI(mid, src) {
      let id = mid.replace(/\.\w+$/i, "");
      if (id.includes("./")) {
        const [o, ...ia] = id.split("/").reverse(),
          [, ...sa] = src.split("/").reverse(),
          oa = [o];
        let s = 0,
          i;
        while ((i = ia.shift())) {
          if (i === "..") s++;
          else if (i === ".") break;
          else oa.push(i);
        }
        if (s < sa.length) oa.push(...sa.slice(s));
        id = oa.reverse().join("/");
      }
      return r.has(id) ? gExpA(id) : import(mid);
    }

    function gC(id, main) {
      return {
        id,
        import: (m) => dI(m, id),
        meta: { url: id, main },
      };
    }

    function gE(exp) {
      return (id, v) => {
        v = typeof id === "string" ? { [id]: v } : id;
        for (const [id, value] of Object.entries(v)) {
          Object.defineProperty(exp, id, {
            value,
            writable: true,
            enumerable: true,
          });
        }
      };
    }

    function rF(main) {
      for (const [id, m] of r.entries()) {
        const { f, exp } = m;
        const { execute: e, setters: s } = f(gE(exp), gC(id, id === main));
        delete m.f;
        m.e = e;
        m.s = s;
      }
    }

    async function gExpA(id) {
      if (!r.has(id)) return;
      const m = r.get(id);
      if (m.s) {
        const { d, e, s } = m;
        delete m.s;
        delete m.e;
        for (let i = 0; i < s.length; i++) s[i](await gExpA(d[i]));
        const r = e();
        if (r) await r;
      }
      return m.exp;
    }

    function gExp(id) {
      if (!r.has(id)) return;
      const m = r.get(id);
      if (m.s) {
        const { d, e, s } = m;
        delete m.s;
        delete m.e;
        for (let i = 0; i < s.length; i++) s[i](gExp(d[i]));
        e();
      }
      return m.exp;
    }
    __instantiate = (m, a) => {
      System = __instantiate = undefined;
      rF(m);
      return a ? gExpA(m) : gExp(m);
    };
  })();
`;

const printer: ts.Printer = ts.createPrinter({ removeComments: false });
function printNodes(nodes: ts.Node[], sourceFile: ts.SourceFile) {
  return printer.printList(
    ts.ListFormat.None,
    ts.factory.createNodeArray(nodes),
    sourceFile,
  );
}

export class SystemPlugin extends TypescriptPlugin {
  constructor(
    {
      compilerOptions = {},
    }: {
      compilerOptions?: ts.CompilerOptions;
    } = {},
  ) {
    super({ compilerOptions });
  }
  async readSource(filePath: string, context: Context) {
    if (isURL(filePath)) {
      await cache(filePath);
      filePath = resolveCache(filePath);
    }
    return await Deno.readTextFile(filePath);
  }

  async createBundle(
    chunk: Chunk,
    context: Context,
  ) {
    const bundleInput = chunk.history[0];

    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.Latest,
      jsx: ts.JsxEmit.React,
      jsxFactory: "React.createElement",
      jsxFragmentFactory: "React.Fragment",
      ...this.compilerOptions,
      module: ts.ModuleKind.System, // "module" cannot be overwritten
    };

    const { chunks, graph, importMap, reload, bundler } = context;

    const bundleAsset = getAsset(graph, chunk.type, bundleInput);
    const specifiers = bundleAsset.dependencies.exports[bundleInput]
      ?.specifiers;

    const hasSpecifiers = specifiers?.length > 0;

    const specifierNodes =
      (hasSpecifiers ? createSystemExports(specifiers) : []);

    const bundleSources: Record<string, string> = {};
    const moduleImportSpecifiers: Record<string, string> = {};
    const moduleImportNodes: Record<string, ts.Node> = {};

    let bundleNeedsUpdate = false;

    const dependencyList = [{
      history: chunk.history,
      type: chunk.type,
      format: chunk.format,
    }, ...chunk.dependencies];

    let source: string | void;

    for (const dependencyItem of dependencyList) {
      // TODO put functions outside for loop
      /**
       * create `System.register` call
       */
      function createSystemRegistry(source: string) {
        const sourceFile = ts.createSourceFile(
          input,
          source,
          ts.ScriptTarget.Latest,
        );

        const transformers = {
          before: [
            typescriptInjectDependenciesTranformer(
              sourceFile,
              chunk,
              { graph, importMap },
            ),
          ],
          after: [
            typescriptInjectInstanceNameTransformer(input),
          ],
        };

        const { diagnostics, outputText } = ts.transpileModule(
          source,
          {
            compilerOptions,
            transformers,
            reportDiagnostics: true,
          },
        );

        if (diagnostics?.length) {
          throw new Error(diagnostics[0].messageText as string);
        }

        return outputText;
      }
      /**
       * create `import * as specifier` node
       */
      function createImportNode(specifier: string) {
        const relativeOutputFilePath = addRelativePrefix(
          path.relative(
            path.dirname(bundleAsset.output),
            dependencyAsset.output,
          ),
        );
        const node = createModuleImport(
          specifier,
          relativeOutputFilePath,
        );
        return node;
      }

      /**
       * check whether dependency is shared between chunks. If so, make sure that dependency creates its own chunk.
       * This prevents code duplicate code across multiple bundle files
       */
      function checkSharedChunk(dependency: string) {
        let dependencyChunk = chunks.find((chunk) =>
          chunk.history[0] === dependency
        );

        if (
          !dependencyChunk
        ) {
          // check if dependency is shared between multiple chunks. If yes, create separate chunk
          for (const chunk of chunks) {
            const chunkInput = chunk.history[0];
            if (
              chunkInput !== dependency && chunkInput !== bundleInput &&
              chunk.dependencies.find((dep) => dep.history[0] === dependency)
            ) {
              dependencyChunk = {
                history: [dependency, ...chunk.history],
                dependencies: [
                  {
                    history: [dependency, ...chunk.history],
                    type: DependencyType.Import,
                    format: Format.Script,
                  },
                ],
                format: Format.Script,
                type: DependencyType.Import,
              };
              chunks.push(dependencyChunk);
              break;
            }
          }
        }
        return dependencyChunk;
      }

      const { history, type } = dependencyItem;
      const input = history[0];

      const needsReload = reload === true ||
        Array.isArray(reload) && reload.includes(input);

      const needsUpdate = needsReload ||
        !await bundler.hasCache(bundleInput, input, context);
      const dependencyAsset = getAsset(graph, type, input);

      if (needsUpdate) {
        const { bundler } = context;

        bundleNeedsUpdate = true;

        // check if dependency should be inlined or have its own chunk
        const dependencyChunk = checkSharedChunk(input);

        if (
          // if should be imported instead of inlined
          bundleInput !== input && dependencyChunk
        ) {
          const specifier = `_${new Sha256().update(input).hex()}`;
          const node = createImportNode(specifier);
          moduleImportNodes[input] = node;
          moduleImportSpecifiers[input] = specifier;
        } else {
          let code;
          const rootInput = history[history.length - 1];
          switch (dependencyAsset.format) {
            case Format.Script: {
              source = await bundler.transformSource(
                bundleInput,
                dependencyItem,
                context,
              ) as string;
              code = createSystemRegistry(source);
              break;
            }
            case Format.Style: {
              source = await bundler.transformSource(
                rootInput,
                dependencyItem,
                context,
              ) as string;
              const sourceFile = ts.createSourceFile(
                input,
                source,
                ts.ScriptTarget.Latest,
              );
              const node = ts.factory.createNoSubstitutionTemplateLiteral(
                source,
                source,
              );
              code = createSystemRegistry(
                createDefaultExport(sourceFile, node),
              );
              break;
            }
            case Format.Json: {
              source = await bundler.transformSource(
                input,
                dependencyItem,
                context,
              ) as string;
              const sourceFile = ts.createSourceFile(
                input,
                source,
                ts.ScriptTarget.Latest,
              );
              const node = ts.factory.createIdentifier(source);
              code = createSystemRegistry(
                createDefaultExport(sourceFile, node),
              );
              break;
            }
          }

          if (code === undefined) {
            throw new Error(
              `code cannot be undefined: ${bundleInput} ${input}`,
            );
          }
          bundleSources[input] = code;
          await bundler.setCache(
            bundleInput,
            input,
            code,
            context,
          );
        }
      } else {
        source = await bundler.getCache(bundleInput, input, context);
        bundleSources[input] = source;
      }
    }

    if (!bundleNeedsUpdate && await fs.exists(bundleAsset.output)) {
      // exit if no changes occured
      return;
    }

    if (source === undefined) {
      throw new Error(`source cannot be undefined`);
    }

    const instantiazeNodes = [
      createSystemInstantiate(bundleInput, hasSpecifiers),
      ...specifierNodes,
    ];

    // inject chunk import specifiers into system code
    if (Object.keys(moduleImportSpecifiers).length) {
      bundleSources[bundleInput] = injectBundleImportSpecifiers(
        bundleInput,
        bundleSources[bundleInput],
        moduleImportSpecifiers,
      );
    }

    const sourceFile = ts.createSourceFile(
      bundleInput,
      source,
      ts.ScriptTarget.Latest,
    );
    const code = [
      systemLoader,
      printNodes(Object.values(moduleImportNodes), sourceFile),
      ...Object.values(bundleSources),
      printNodes(Object.values(instantiazeNodes), sourceFile),
    ].join("\n");

    return code;
  }
}
