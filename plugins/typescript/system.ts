import { Sha256 } from "https://deno.land/std@0.79.0/hash/sha256.ts";
import { path, ts } from "../../deps.ts";
import { Data, Plugin, TestFunction } from "../plugin.ts";
import { typescriptInjectInstantiateNameTransformer } from "./transformers/inject_instanciate_name.ts";
import { typescriptInjectOutputsTranformer } from "./transformers/inject_outputs.ts";
import { resolve as resolveCache } from "../../cache.ts";
import { addRelativePrefix } from "../../_util.ts";

import { TextPlugin } from "../text.ts";
import { DefaultExportPlugin } from "../default_export.ts";
import { CssInjectImportsPlugin } from "../css/inject_imports.ts";
import { CssRemoveImportsPlugin } from "../css/remove_imports.ts";
import { Chunk } from "../../chunk.ts";


const printer = ts.createPrinter(
  { removeComments: false },
);
const sourceFile = ts.createSourceFile("x.ts", "", ts.ScriptTarget.Latest);

function createSystemInstantiate(input: string): string {
  const __exp = ts.createVariableStatement(
    undefined,
    ts.createVariableDeclarationList(
      [ts.createVariableDeclaration(
        ts.createIdentifier("__exp"),
        undefined,
        ts.createCall(
          ts.createIdentifier("__instantiate"),
          undefined,
          [
            ts.createStringLiteral(input),
            ts.createFalse(),
          ],
        ),
      )],
      ts.NodeFlags.Const,
    ),
  );

  return printer.printNode(ts.EmitHint.Unspecified, __exp, sourceFile);
}

function exportString(key: string, value: string) {
  const statement = ts.createVariableStatement(
    [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.createVariableDeclarationList(
      [ts.createVariableDeclaration(
        ts.createIdentifier(key),
        undefined,
        ts.createElementAccess(
          ts.createIdentifier("__exp"),
          ts.createStringLiteral(value),
        ),
      )],
      ts.NodeFlags.Const,
    ),
  );

  return printer.printNode(ts.EmitHint.Unspecified, statement, sourceFile);
}

function defaultExportString(value: string) {
  const assignment = ts.createExportAssignment(
    undefined,
    undefined,
    undefined,
    ts.createElementAccess(
      ts.createIdentifier("__exp"),
      ts.createStringLiteral(value),
    ),
  );
  return printer.printNode(ts.EmitHint.Unspecified, assignment, sourceFile);
}

export function createSystemExports(exportSpecifiers: string[]): string[] {
  const strings = [];
  for (const key of exportSpecifiers) {
    switch (key) {
      case "default": {
        strings.push(defaultExportString(key));
        break;
      }
      default: {
        strings.push(exportString(key, key));
        break;
      }
    }
  }
  return strings;
}

function createSystemLoader() {
  // return await fetch(
  //   "https://raw.githubusercontent.com/denoland/deno/master/cli/system_loader.js",
  // ).then((data) => data.text());

  // content of https://raw.githubusercontent.com/denoland/deno/master/cli/system_loader.js
  return `// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.

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
})();`;
}

export function injectBundleImport(
  source: string,
  specifiers: Record<string, string>,
): string {
  const sourceFile = ts.createSourceFile(
    "x.ts",
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

export function createModuleImport(
  specifier: string,
  filePath: string,
): string {
  const declaration = ts.createImportDeclaration(
    undefined,
    undefined,
    ts.createImportClause(
      undefined,
      ts.createNamespaceImport(ts.createIdentifier(specifier)),
      false,
    ),
    ts.createStringLiteral(filePath),
  );
  const sourceFile = ts.createSourceFile("x.ts", "", ts.ScriptTarget.Latest);
  return printer.printNode(ts.EmitHint.Unspecified, declaration, sourceFile);
}

const systemLoader = createSystemLoader();

export class SystemPlugin extends Plugin {
  compilerOptions: ts.CompilerOptions;
  constructor(
    {
      test = (input: string) => /\.(t|j)sx?$/.test(input),
      compilerOptions = {},
    }: {
      test?: TestFunction;
      compilerOptions?: ts.CompilerOptions;
    } = {},
  ) {
    super({ test });
    this.compilerOptions = compilerOptions;
  }
  async createBundle(
    chunk: Chunk,
    data: Data,
  ) {
    const { bundler, graph, chunks, reload } = data;
    const input = chunk.inputHistory[chunk.inputHistory.length - 1];
    const bundleSources: Record<string, string> = {};
    const moduleImportSpecifiers: Record<string, string> = {};
    const moduleImports: Record<string, string> = {};
    let bundleNeedsUpdate = false;

    for (const dependency of chunk.dependencies) {
      const resolvedFilePath = resolveCache(dependency);
      const needsUpdate = reload ||
        !await chunk.hasCache(resolvedFilePath);
      let source: string;
      if (needsUpdate) {
        bundleNeedsUpdate = true;

        source = await bundler.transformSource(
          dependency,
          chunk.inputHistory[0],
          chunk,
          data,
        ) as string;

        const cssImports = {};
        const plugins: Plugin[] = [
          new CssRemoveImportsPlugin({
            imports: cssImports,
          }),
          new TextPlugin({
            test: (input: string) =>
              input.endsWith(".css") || input.endsWith(".svg"),
          }),
          new DefaultExportPlugin({
            test: (input: string) =>
              input.endsWith(".css") || input.endsWith(".svg") ||
              input.endsWith(".json"),
          }),
          new CssInjectImportsPlugin({
            imports: cssImports,
          }),
        ];

        for (const plugin of plugins) {
          
          if (plugin.transform && await plugin.test(dependency, data)) {
            source = await plugin.transform(
              dependency,
              source,
              input,
              data,
            ) as string;
          }
        }

        const { diagnostics, outputText } = ts.transpileModule(
          source,
          {
            compilerOptions: {
              target: ts.ScriptTarget.ES2015,
              jsx: ts.JsxEmit.React,
              jsxFactory: "React.createElement",
              jsxFragmentFactory: "React.Fragment",
              ...this.compilerOptions,
              module: ts.ModuleKind.System,
            },
            transformers: {
              before: [
                typescriptInjectOutputsTranformer(
                  dependency,
                  source,
                  graph,
                  bundler.importMap,
                ),
              ],
              after: [
                typescriptInjectInstantiateNameTransformer(dependency),
              ],
            },
            reportDiagnostics: true,
          },
        );

        if (diagnostics?.length) {
          throw new Error(diagnostics[0].messageText as string);
        }
        source = outputText;

        const { output: dependencyOutput } = graph[dependency];
        let dependencyChunk = chunks.get(dependency);
        // check if dependency is shared between multiple chunks. If yes, create separate chunk
        if (input !== dependency && !dependencyChunk) {
          for (const [chunkInput, chunk] of chunks.entries()) {
            if (
              chunkInput !== dependency && chunkInput !== input &&
              chunk.dependencies.has(dependency)
            ) {
              const newChunk = new Chunk(bundler, {
                inputHistory: [...chunk.inputHistory, dependency],
                dependencies: new Set([dependency]),
              });
              dependencyChunk = newChunk;
              chunks.set(dependency, newChunk);
              break;
            }
          }
        }

        if (
          dependency !== input && dependencyChunk &&
          dependencyOutput.endsWith(".js")
        ) {
          const specifier = `_${new Sha256().update(dependency).hex()}`;
          const outputFilePath = graph[dependency].output;
          const relativeOutputFilePath = addRelativePrefix(
            path.relative(
              path.dirname(graph[input].output),
              outputFilePath,
            ),
          );
          moduleImports[dependency] = createModuleImport(
            specifier,
            relativeOutputFilePath,
          );
          moduleImportSpecifiers[dependency] = specifier;
        } else {
          bundleSources[dependency] = source;
        }
        await chunk.setCache(
          resolvedFilePath,
          source,
        );
      } else {
        source = await chunk.getCache(resolvedFilePath);
        bundleSources[dependency] = source;
      }
    }

    if (!bundleNeedsUpdate) {
      return;
    }
    const specifiers = graph[input].exports[input]?.specifiers;

    if (Object.keys(moduleImports).length) {
      bundleSources[input] = injectBundleImport(
        bundleSources[input],
        moduleImportSpecifiers,
      );
    }

    const bundle = [
      ...Object.values(moduleImports),
      systemLoader,
      ...Object.values(bundleSources),
      createSystemInstantiate(input),
      ...(specifiers ? createSystemExports(specifiers) : []),
    ].join("\n");

    return bundle;
  }
}
