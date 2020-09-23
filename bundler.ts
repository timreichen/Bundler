import { colors, fs, ImportMap, path, Sha256 } from "./deps.ts";
import {
  createInstantiateString,
  createSystemExports,
  createSystemLoader,
} from "./system.ts";
import type { Plugin } from "./plugins/plugin.ts";
import type { Loader } from "./plugins/loader.ts";
import {
  createGraph,
  getSource,
  getOutput,
  Graph,
  FileMap,
  InputMap,
} from "./graph.ts";

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

export async function bundle(
  inputMap: InputMap,
  fileMap: FileMap,
  {
    outDir = "dist",
    depsDir = "deps",
    cacheDir = ".cache",
    graph: initialGraph = {},
    importMap = { imports: {}, scopes: {} },
    loaders = [],
    transformers = [],
    optimizers = [],
    reload = false,
    optimize = false,
  }: {
    outDir?: string;
    depsDir?: string;
    cacheDir?: string;
    graph?: Graph;
    importMap?: ImportMap;
    loaders?: Loader[];
    transformers?: Plugin[];
    optimizers?: Plugin[];
    reload?: boolean;
    optimize?: boolean;
  } = {},
) {
  const outputMap: OutputMap = {};

  const depsPath = path.join(outDir, depsDir);
  const cacheDirPath = path.join(outDir, cacheDir);
  const cacheMap: CacheMap = {};

  const inputs: string[] = Object.keys(inputMap);

  fileMap = { ...fileMap };

  const graph = await createGraph(
    inputMap,
    loaders,
    { graph: initialGraph, fileMap, importMap, baseURL: depsPath },
  );

  const checkedInputs: Set<string> = new Set();
  while (inputs.length) {
    const input = inputs.pop()!;
    if (checkedInputs.has(input)) continue;
    checkedInputs.add(input);
    const entry = graph[input];

    const queue: string[] = [];
    Object.entries(entry.imports).forEach(([input, { dynamic }]) => {
      if (dynamic) {
        inputs.push(input);
      } else {
        queue.push(input);
      }
    });

    const strings: string[] = [];
    strings.push(await createSystemLoader());

    let bundleNeedsUpdate = false;

    const { imports } = graph[input];

    const dependencies = [input];

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
      dependencies.push(...Object.values(exports).map(({ input }) => input));

      const cacheFileExists = await fs.exists(cacheOutput);

      const modified = cacheFileExists &&
        Deno.statSync(filePath).mtime! > Deno.statSync(cacheOutput).mtime!;
      // if cache file is up to date, get source from that cache file
      if (!reload && cacheFileExists && !modified) {
        console.log(colors.green(`Check`), dependency);
        strings.push(await getCacheSource(cacheOutput, cacheMap));
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
            console.log(colors.green(`Create`), dependency);
          } else {
            console.log(colors.green(`Update`), dependency);
          }
        }

        cacheMap[cacheOutput] = source;

        strings.push(source);
      }
    }

    const output = getOutput(input, fileMap, depsPath);

    const outputFileExists = await fs.exists(output);

    if (!outputFileExists) {
      bundleNeedsUpdate = true;
    }

    if (bundleNeedsUpdate) {
      strings.push(createInstantiateString(output));
      strings.push(createSystemExports(Object.keys(entry.exports)));

      let string = strings.join("\n");

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

      if (!outputFileExists) {
        console.log(colors.blue(`Create`), input);
      } else {
        console.log(colors.blue(`Update`), input);
      }
      outputMap[output] = string;
    } else {
      console.log(colors.blue(`up-to-date`), input);
    }
  }

  return {
    outputMap,
    cacheMap,
    graph,
  };
}
