import { cache, resolve as resolveWithCache } from "./cache.ts";
import { path, Sha256, ImportMap } from "./deps.ts";
import type { Loader } from "./plugins/loader.ts";
import { isURL } from "./_helpers.ts";

export interface Imports {
  [input: string]: { dynamic: boolean };
}
export interface Exports {
  [input: string]: { input: string };
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
    inputMap[input] = await Deno.readTextFile(filePath);
  }
  return inputMap[input];
}

export async function createGraph(
  inputMap: InputMap,
  loaders: Loader[],
  { graph = {}, fileMap = {}, baseURL = "", importMap = { imports: {} } }: {
    graph?: Graph;
    fileMap?: FileMap;
    baseURL?: string;
    importMap?: ImportMap;
  } = {},
) {
  const queue = Object.keys(inputMap);
  const checkedInputs: Set<string> = new Set();

  loop:
  while (queue.length) {
    const input = queue.pop()!;
    if (checkedInputs.has(input)) continue;
    checkedInputs.add(input);
    const resolvedPath = isURL(input) ? resolveWithCache(input) : input;

    let entry = graph[input];
    if (entry) {
      queue.push(...Object.keys(entry.imports));
      queue.push(
        ...Object.values(entry.exports).map(({ input }: { input: string }) =>
          input
        ),
      );
    } else {
      const source = await getSource(input, inputMap, importMap);
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
          queue.push(...Object.keys(entry.imports));
          queue.push(
            ...Object.values(entry.exports).map((
              { input }: { input: string },
            ) => input),
          );
          continue loop;
        }
      }
    }
  }
  return graph;
}
