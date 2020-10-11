import { cache, resolve as resolveWithCache } from "./cache.ts";
import { fs, ImportMap, path, Sha256 } from "./deps.ts";
import type { Loader } from "./plugins/loader.ts";
import { isURL } from "./_util.ts";

export interface Imports {
  [input: string]: { dynamic: boolean };
}

export interface Exports {
  [input: string]: string[];
}

export interface GraphEntry {
  path: string;
  output: string;
  imports: Imports;
  exports: Exports;
}

export interface Graph {
  [input: string]: GraphEntry;
}

export interface InputMap {
  [input: string]: string;
}

export interface FileMap {
  [input: string]: string;
}

export function getOutput(input: string, fileMap: FileMap, baseURL: string) {
  return fileMap[input] = fileMap[input] ||
    `${path.join(baseURL, new Sha256().update(input).hex())}.js`;
}

export async function getSource(
  input: string,
  inputMap: InputMap,
  importMap: ImportMap,
): Promise<string> {
  if (!inputMap[input]) {
    let filePath = input;
    if (isURL(filePath)) {
      await cache(filePath, { importMap });
      filePath = resolveWithCache(filePath);
    }
    if (!isURL(filePath) && !await fs.exists(filePath)) {
      throw Error(`file '${input}' import not found: '${filePath}'`);
    }
    inputMap[input] = await Deno.readTextFile(filePath);
  }
  return inputMap[input];
}

export async function create(
  inputMap: InputMap,
  loaders: Loader[],
  {
    graph = {},
    fileMap = {},
    baseURL = "",
    importMap = { imports: {} },
    reload = false,
  }: {
    graph?: Graph;
    fileMap?: FileMap;
    baseURL?: string;
    importMap?: ImportMap;
    reload?: boolean;
  } = {},
): Promise<Graph> {
  const queue = Object.keys(inputMap);
  const checkedInputs: Set<string> = new Set();

  const sources: InputMap = { ...inputMap };

  while (queue.length) {
    const input = queue.pop()!;
    if (checkedInputs.has(input)) continue;
    checkedInputs.add(input);
    const resolvedPath = isURL(input) ? resolveWithCache(input) : input;

    let entry = graph[input];
    if (!reload && entry) {
      queue.push(...Object.keys(entry.imports));
      queue.push(
        ...Object.keys(entry.exports),
      );
    } else {
      const source = await getSource(input, sources, importMap);
      for (const loader of loaders) {
        if (loader.test(input)) {
          const result = await loader.fn(input, source, { importMap });
          entry = graph[input] = {
            path: resolvedPath,
            output: getOutput(input, fileMap, baseURL),
            imports: {},
            exports: {},
            ...result,
          };
          for (const dependency of Object.keys(entry.imports)) {
            queue.push(dependency);
          }
          for (const dependency of Object.keys(entry.exports)) {
            queue.push(dependency);
          }
          break;
        }
      }
    }
  }

  return graph;
}
