import { colors, fs, ImportMap, path, Sha256, ts } from "./deps.ts";
import {
  createInstantiateString,
  createSystemExports,
  createSystemLoader,
} from "./system.ts";
import type { Plugin } from "./plugins/plugin.ts";
import type { Loader } from "./plugins/loader.ts";
import {
  create as createGraph,
  FileMap,
  getOutput,
  getSource,
  Graph,
  InputMap,
} from "./graph.ts";
import { addRelativePrefix, removeRelativePrefix } from "./_util.ts";

export interface OutputMap {
  [output: string]: string;
}

export interface CacheMap {
  [output: string]: string;
}

async function getCacheSource(cacheOutput: string, cacheMap: CacheMap) {
  if (!cacheMap[cacheOutput]) {
    cacheMap[cacheOutput] = await Deno.readTextFile(cacheOutput);
  }
  return cacheMap[cacheOutput];
}

const printer: ts.Printer = ts.createPrinter(
  { newLine: ts.NewLineKind.LineFeed, removeComments: false },
);

function create(specifier: string, filePath: string) {
  const printer: ts.Printer = ts.createPrinter(
    { newLine: ts.NewLineKind.LineFeed, removeComments: false },
  );
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
  return printer.printNode(ts.EmitHint.Unspecified, declaration, undefined);
}

function bundleLoaderTransformer(specifier: string) {
  return (context: ts.TransformationContext) => {
    const visit: ts.Visitor = (node: ts.Node) => {
      if (
        ts.isCallExpression(node) &&
        node.expression?.expression?.escapedText === "System" &&
        node.expression?.name?.escapedText === "register"
      ) {
        return ts.visitEachChild(node, (node: ts.Node) => {
          if (node.kind === ts.SyntaxKind["FunctionExpression"]) {
            return ts.visitEachChild(node, (node: ts.Node) => {
              if (node.kind === ts.SyntaxKind["Block"]) {
                return ts.visitEachChild(node, (node: ts.Node) => {
                  if (node.kind === ts.SyntaxKind["ReturnStatement"]) {
                    return ts.visitEachChild(node, (node: ts.Node) => {
                      if (
                        node.kind === ts.SyntaxKind["ObjectLiteralExpression"]
                      ) {
                        return ts.visitEachChild(node, (node: ts.Node) => {
                          if (
                            node.kind === ts.SyntaxKind["PropertyAssignment"]
                          ) {
                            return ts.visitEachChild(node, (node: ts.Node) => {
                              if (
                                node.kind ===
                                  ts.SyntaxKind["FunctionExpression"]
                              ) {
                                return ts.visitEachChild(
                                  node,
                                  (node: ts.Node) => {
                                    if (node.kind === ts.SyntaxKind["Block"]) {
                                      return ts.visitEachChild(
                                        node,
                                        (node: ts.Node) => {
                                          if (
                                            node.kind ===
                                              ts.SyntaxKind[
                                                "ExpressionStatement"
                                              ]
                                          ) {
                                            return ts.visitEachChild(
                                              node,
                                              (node: ts.Node) => {
                                                if (
                                                  node.kind ===
                                                    ts.SyntaxKind[
                                                      "CallExpression"
                                                    ] &&
                                                  node.expression
                                                      .escapedText ===
                                                    "exports_1"
                                                ) {
                                                  return ts.visitEachChild(
                                                    node,
                                                    (node: ts.Node) => {
                                                      if (
                                                        node.kind ===
                                                          ts.SyntaxKind[
                                                            "BinaryExpression"
                                                          ]
                                                      ) {
                                                        return ts.createBinary(
                                                          node.left,
                                                          ts.createToken(
                                                            ts.SyntaxKind
                                                              .EqualsToken,
                                                          ),
                                                          ts.createPropertyAccess(
                                                            ts.createIdentifier(
                                                              specifier,
                                                            ),
                                                            node.right.text,
                                                          ),
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

function injectBundleLoader(source: string, specifier: string) {
  const sourceFile = ts.createSourceFile(
    "x.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const result = ts.transform(sourceFile, [bundleLoaderTransformer(specifier)]);
  return printer.printNode(
    ts.EmitHint.SourceFile,
    result.transformed[0],
    sourceFile,
  );
}

export async function bundle(
  inputMap: InputMap = {},
  {
    outDir = "dist",
    depsDir = "deps",
    cacheDir = ".cache",
    graph: initialGraph = {},
    fileMap = {},
    importMap = { imports: {}, scopes: {} },
    loaders = [],
    transformers = [],
    optimizers = [],
    reload = false,
    optimize = false,
    quiet = false,
  }: {
    outDir?: string;
    depsDir?: string;
    cacheDir?: string;
    graph?: Graph;
    fileMap?: FileMap;
    importMap?: ImportMap;
    loaders?: Loader[];
    transformers?: Plugin[];
    optimizers?: Plugin[];
    reload?: boolean;
    optimize?: boolean;
    quiet?: boolean;
  } = {},
): Promise<{ outputMap: OutputMap; cacheMap: CacheMap; graph: Graph }> {
  const outputMap: OutputMap = {};

  const depsPath = path.join(outDir, depsDir);
  const cacheDirPath = path.join(outDir, cacheDir);
  const cacheMap: CacheMap = {};

  fileMap = { ...fileMap };

  const graph = await createGraph(
    inputMap,
    loaders,
    { graph: initialGraph, fileMap, importMap, baseURL: depsPath, reload },
  );

  const inputs = Object.keys(inputMap).map(removeRelativePrefix);

  const entries: Set<string> = new Set(inputs);
  for (const entry of Object.values(graph)) {
    Object.entries(entry.imports).forEach(([specifier, { dynamic }]) => {
      if (dynamic) entries.add(specifier);
    });
  }

  const checkedInputs: Set<string> = new Set();
  while (inputs.length) {
    const input = inputs.pop()!;
    if (checkedInputs.has(input)) continue;
    checkedInputs.add(input);

    if (!quiet) {
      console.log(colors.blue(`Bundle`), input);
    }

    const entry = graph[input];

    const strings: string[] = [];
    strings.push(await createSystemLoader());

    let bundleNeedsUpdate = false;

    const { imports } = graph[input];

    const dependencies = [input];
    const moduleImports: Set<string> = new Set();
    const output = getOutput(input, fileMap, depsPath);

    Object.entries(imports).forEach(([input, { dynamic }]) => {
      if (dynamic) {
        inputs.push(input);
      } else {
        dependencies.push(input);
      }
    });

    const checkedDependencies: Set<string> = new Set();
    while (dependencies.length) {
      const dependency = dependencies.pop()!;
      if (checkedDependencies.has(dependency)) continue;
      checkedDependencies.add(dependency);

      const { imports, exports, path: filePath } = graph[dependency];

      const cacheOutput = path.join(
        cacheDirPath,
        new Sha256().update(dependency).hex(),
      );

      Object.entries(imports).forEach(([input, { dynamic }]) => {
        if (dynamic) {
          inputs.push(input);
        } else {
          dependencies.push(input);
        }
      });
      dependencies.push(...Object.keys(exports));

      const cacheFileExists = await fs.exists(cacheOutput);

      const modified = cacheFileExists &&
        Deno.statSync(filePath).mtime! > Deno.statSync(cacheOutput).mtime!;
      // if cache file is up to date, get source from that cache file

      let string: string;
      if (
        ((!reload && cacheFileExists) || cacheMap[cacheOutput]) && !modified
      ) {
        string = await getCacheSource(cacheOutput, cacheMap);
        if (!quiet && filePath !== input) {
          console.log(colors.green(`Check`), dependency);
        }
      } else {
        // if cache file does not exist or is out of date create apply transformers to source and create new cache file
        bundleNeedsUpdate = true;

        let source = await getSource(filePath, inputMap, importMap);
        for (const transformer of transformers) {
          if (await transformer.test(dependency)) {
            source = await transformer.fn(
              dependency,
              source,
              { graph, fileMap, importMap, outDir, depsDir },
            );
          }
        }

        // Bundle file has special log. Only log dependency files
        if (filePath !== input) {
          if (!cacheFileExists) {
            if (!quiet) console.log(colors.green(`Create`), dependency);
          } else {
            if (!quiet) console.log(colors.green(`Update`), dependency);
          }
        }

        cacheMap[cacheOutput] = source;
        string = source;
      }

      if (filePath !== input && entries.has(filePath)) {
        const depsOutput = getOutput(filePath, fileMap, depsPath);
        const relativePath = addRelativePrefix(
          path.relative(path.dirname(output), depsOutput),
        );
        const specifier = `_${new Sha256().update(filePath).hex()}`;
        moduleImports.add(create(specifier, relativePath));
        string = injectBundleLoader(string, specifier);
      }

      strings.push(string);
    }

    const outputFileExists = await fs.exists(output);

    if (!outputFileExists) {
      bundleNeedsUpdate = true;
    }

    if (bundleNeedsUpdate) {
      strings.push(createInstantiateString(output));
      for (const exports of Object.values(entry.exports)) {
        strings.push(createSystemExports(exports));
      }

      let string = [...moduleImports, ...strings].join("\n");

      if (optimize) {
        for (const optimizer of optimizers) {
          if (optimizer.test(input)) {
            string = await optimizer.fn(
              input,
              string,
              { graph, fileMap, importMap, outDir, depsDir },
            );
          }
        }
      }
      outputMap[output] = string;
    } else {
      if (!quiet) console.log(colors.green(`up-to-date`), input);
    }
  }

  return {
    outputMap,
    cacheMap,
    graph,
  };
}
