import { ts, fs, path, colors, Sha256, ImportMap } from "./deps.ts";
import {
  CompilerOptions,
  getSpecifierNodeMap,
  isDynamicImportNode,
  getDynamicImportNode,
  isImportNode,
  getImportNode,
  isExportNode,
  getExportNode,
} from "./typescript.ts";

import {
  resolve as resolveDependencyPath,
} from "./dependencies.ts";
import { Plugin, PluginType } from "./plugins/plugin.ts";
import { isURL } from "./_helpers.ts";
import { resolve as resolveCachedPath, cache } from "./cache.ts";
import {
  instantiateString,
  createSystemExports,
  injectInstantiateName,
  systemLoader,
} from "./system.ts";

const { green, blue } = colors;

interface ModuleMap {
  [input: string]: string;
}

/**
 * Object containing input file paths as key and source code as value.
 * ```ts
 * const inputMap = {
 *   "src/index.ts": `console.log("Hello World")`
 * }
 * ```
 */
export interface InputMap {
  [input: string]: string;
}

/**
 * Object containing input file paths as key and output file path as value.
 * ```ts
 * const inputMap = {
 *   "src/index.ts": "dist/index.js"
 * }
 * ```
 */
export interface OutputMap {
  [input: string]: string;
}

export interface CacheMap {
  [outputFile: string]: {
    input: string;
    output: string;
    imports: string[];
  };
}

async function getSource(
  specifier: string,
  modules: InputMap,
): Promise<string> {
  return modules[specifier] = modules[specifier] ||
    (isURL(specifier)
      ? await fetch(specifier).then((data) => data.text())
      : await Deno.readTextFile(specifier));
}

function injectOutputsTranformer(
  input: string,
  source: string,
  {
    graph,
    importMap,
  }: {
    graph: Graph;
    importMap: ImportMap;
  },
) {
  return (context: ts.TransformationContext) => {
    const visit: ts.Visitor = (node: ts.Node) => {
      let specifierNode: ts.Node = null;
      let specifier: string | null = null;
      if (isImportNode(node)) {
        specifierNode = getImportNode(node);
        const specifierText = specifierNode.text;
        const resolvedSpecifier = resolveDependencyPath(
          input,
          specifierText,
          importMap,
        );
        specifier = graph[resolvedSpecifier].output;
      }
      if (isDynamicImportNode(node)) {
        specifierNode = getDynamicImportNode(node, source);
        const specifierText = specifierNode.text;
        const resolvedSpecifier = resolveDependencyPath(
          input,
          specifierText,
          importMap,
        );
        specifier = graph[resolvedSpecifier].output;
        const relativeOutput = path.relative(
          path.dirname(graph[input].output),
          specifier,
        );
        specifier = `./${relativeOutput}`;
      }
      if (isExportNode(node)) {
        specifierNode = getExportNode(node);
        const specifierText = specifierNode.text;
        const resolvedSpecifier = resolveDependencyPath(
          input,
          specifierText,
          importMap,
        );
        specifier = graph[resolvedSpecifier].output;
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

function transpile(
  input: string,
  source: string,
  { graph, importMap, compilerOptions }: {
    graph: Graph;
    importMap: ImportMap;
    compilerOptions: CompilerOptions;
  },
) {
  compilerOptions = {
    target: "esnext",
    ...compilerOptions,
    module: "system",
  };
  const output = graph[input].output;

  const { diagnostics, outputText } = ts.transpileModule(source, {
    compilerOptions: ts.convertCompilerOptionsFromJson(compilerOptions).options,
    transformers: {
      before: [injectOutputsTranformer(input, source, { graph, importMap })],
      after: [injectInstantiateName(output)],
    },
    reportDiagnostics: true,
  });

  for (const diagnostic of diagnostics) {
    console.error(`error during transpilation: ${diagnostic.messageText}`);
  }

  return outputText;
}

const systemLoaderWrapper = await systemLoader();

export async function bundle(
  inputMap: InputMap,
  outputMap: OutputMap,
  {
    outDir = "dist",
    depsDir = "deps",
    cacheDir = ".cache",
    compilerOptions = {},
    importMap = { imports: {}, scopes: {} },
    graph: initialGraph = {},
    transformers = [],
    optimizers = [],
    reload = false,
    optimize = false,
  }: {
    outDir?: string;
    depsDir?: string;
    cacheDir?: string;
    compilerOptions?: CompilerOptions;
    importMap?: ImportMap;
    graph?: Graph;
    transformers?: Plugin[];
    optimizers?: Plugin[];
    reload?: boolean;
    optimize?: boolean;
  } = {},
): Promise<{ modules: ModuleMap; graph: Graph }> {
  const start = performance.now();

  const { graph, sourceMap } = await createGraph(
    inputMap,
    initialGraph,
    { outDir, depsDir, cacheDir, importMap, outputMap, reload },
  );

  const modules: OutputMap = {};

  const inputs = Object.keys(inputMap);

  const queue: string[] = inputs;
  while (queue.length) {
    const input = queue.pop()!;
    if (modules[input]) continue;

    console.log(blue(`Bundle`), input);

    let bundleModified = false;

    const { output } = graph[input];

    const exist = await fs.exists(output);
    const modified = exist &&
      Deno.statSync(input).mtime! > Deno.statSync(output).mtime!;
    const { imports, exports } = graph[input];

    const dependencies = Object.entries({
      [input]: {
        input,
        dynamic: false,
      },
      ...imports,
    });

    // if output file does not exist or input file changed
    if (!exist || modified) {
      bundleModified = true;
    }

    let string = ``;
    string += systemLoaderWrapper;

    const checkedDependencies = new Set();
    while (dependencies.length) {
      const [dependency, { input, dynamic }] = dependencies.pop()!;
      if (checkedDependencies.has(dependency)) continue;
      checkedDependencies.add(dependency);
      if (dynamic) {
        queue.push(dependency);
      } else {
        const { imports, cacheOutput } = graph[dependency];
        dependencies.push(...Object.entries(imports));
        const exist = await fs.exists(cacheOutput);
        const modified = exist &&
          Deno.statSync(input).mtime! > Deno.statSync(cacheOutput).mtime!;
        if (exist && !modified) {
          console.log(green(`Check`), dependency);
          string += `\n`;
          string += await Deno.readTextFile(cacheOutput);
        } else {
          bundleModified = true;
          let source = await getSource(input, sourceMap);
          for (const transformer of transformers) {
            source = await transformer.run(source, input);
          }

          source = transpile(
            dependency,
            source,
            { graph, importMap, compilerOptions },
          );
          if (!exist) {
            console.log(green(`Create`), dependency);
          } else {
            console.log(green(`Update`), dependency);
          }

          await fs.ensureFile(cacheOutput);
          await Deno.writeTextFile(cacheOutput, source);

          string += `\n`;
          string += source;
        }
      }
    }

    string += `\n`;
    string += instantiateString(output);
    string += createSystemExports(Object.keys(exports));

    if (optimize) {
      for (const optimizer of optimizers) {
        string = await optimizer.run(string, input);
      }
    }

    modules[output] = string;

    if (bundleModified) {
      console.log(blue(`Update`), output);
      await fs.ensureFile(output);
      await Deno.writeTextFile(output, string);
    } else {
      console.log(blue(`up-to-date`), output);
    }
  }

  console.log(blue(`${Math.ceil(performance.now() - start)}ms`));

  return { modules, graph };
}

export interface Graph {
  [path: string]: {
    input: string;
    output: string;
    cacheOutput: string;
    imports: { [path: string]: { input: string; dynamic: boolean } };
    exports: { [name: string]: string };
  };
}

async function createGraph(
  inputMap: InputMap,
  initialGraph: Graph,
  { outDir, depsDir, cacheDir, importMap, outputMap, reload }: {
    outDir: string;
    depsDir: string;
    cacheDir: string;
    importMap: ImportMap;
    outputMap: OutputMap;
    reload: boolean;
  },
) {
  const depsDirPath = path.join(outDir, depsDir);
  const cacheDirPath = path.join(outDir, cacheDir);
  const graph: Graph = {};
  const sourceMap: InputMap = { ...inputMap };

  const queue = Object.keys(inputMap).reduce((array, key) => {
    array.push({ input: key, path: key });
    return array;
  }, [] as { input: string; path: string }[]);
  const checkedInputs: Set<string> = new Set();

  while (queue.length) {
    const { input, path: inputPath } = queue.pop()!;
    if (checkedInputs.has(input)) continue;
    checkedInputs.add(input);

    const entry = initialGraph[inputPath];

    let needsUpdate = false;
    if (!reload && entry) {
      const { input, cacheOutput } = entry;
      const inputModified = Deno.statSync(input).mtime!.getTime();
      const exists = await fs.exists(cacheOutput);
      const outputModified = exists &&
        Deno.statSync(cacheOutput).mtime!.getTime();

      needsUpdate = !exists || inputModified > outputModified;
    } else {
      needsUpdate = true;
    }

    if (needsUpdate) {
      // console.log(green(`Create`), inputPath)
      const source = await getSource(input, sourceMap);
      const { imports: importNodeMap, exports: exportNodeMap } =
        await getSpecifierNodeMap(source);
      const imports: { [path: string]: { input: string; dynamic: boolean } } =
        {};
      for (const [specifier, node] of Object.entries(importNodeMap)) {
        const resolvedFilePath = await resolveDependencyPath(
          inputPath,
          specifier,
          importMap,
        );
        const cachedFilePath = resolveCachedPath(resolvedFilePath);
        if (isURL(resolvedFilePath) && !await fs.exists(cachedFilePath)) {
          await cache(resolvedFilePath);
        }
        const input = cachedFilePath || resolvedFilePath;
        imports[resolvedFilePath] = {
          input,
          dynamic: isDynamicImportNode(node),
        };
        queue.push({ input, path: resolvedFilePath });
      }

      const exports: { [name: string]: string } = {};

      for (const [symbol, node] of Object.entries(exportNodeMap)) {
        exports[symbol] = symbol;
      }

      const output = outputMap[inputPath] ||
        path.posix.join(depsDirPath, `${new Sha256().update(input).hex()}.js`);
      const cacheOutput = path.join(
        cacheDirPath,
        new Sha256().update(input).hex(),
      );

      const entry = {
        input,
        output,
        cacheOutput,
        imports,
        exports,
      };
      graph[inputPath] = entry;
    } else {
      // console.log(green(`Check`), inputPath)
      graph[inputPath] = entry;
      Object.entries(entry.imports).forEach(([filePath, { input }]) =>
        queue.push({ input, path: filePath })
      );
    }
  }

  return { graph, sourceMap };
}
