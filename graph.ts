import { cache, resolve as resolveWithCache } from "./cache.ts";
import { fs, ImportMap, path, Sha256 } from "./deps.ts";
import type { Loader } from "./plugins/loader.ts";
import { addRelativePrefix, isURL, removeRelativePrefix } from "./_util.ts";

export interface Imports {
  [input: string]: { specifiers?: string[]; dynamic?: true };
}

export interface Exports {
  [input: string]: {
    specifiers: string[];
  };
}

export interface Asset {
  path: string;
  output: string;
  imports: Imports;
  exports: Exports;
}

export interface Graph {
  [input: string]: Asset;
}

export interface InputMap {
  [input: string]: string;
}

export interface FileMap {
  [input: string]: string;
}

export function getOutput(input: string, fileMap: FileMap, baseURL: string) {
  const noPrefixInput = removeRelativePrefix(input);
  let entry = fileMap[noPrefixInput] || fileMap[addRelativePrefix(input)];
  if (!entry) {
    entry = fileMap[noPrefixInput] = `${
      path.join(baseURL, new Sha256().update(noPrefixInput).hex())
    }.js`;
  }
  return removeRelativePrefix(entry);
}

export async function getSource(
  input: string,
  inputMap: InputMap,
  importMap: ImportMap,
): Promise<string> {
  const noPrefixInput = removeRelativePrefix(input);
  let entry = inputMap[noPrefixInput] || inputMap[addRelativePrefix(input)];
  if (!entry) {
    let filePath = noPrefixInput;
    if (isURL(filePath)) {
      await cache(filePath, { importMap });
      filePath = resolveWithCache(filePath);
    }
    if (!isURL(filePath) && !await fs.exists(filePath)) {
      throw Error(`file '${filePath}' was not found`);
    }
    entry = inputMap[noPrefixInput] = await Deno.readTextFile(filePath);
  }
  return entry;
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
  const queue = Object.keys(inputMap).map(removeRelativePrefix);
  const checkedInputs: Set<string> = new Set();

  const sources = {
    ...inputMap,
  };

  loop:
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
      for (const loader of loaders) {
        if (loader.test(input)) {
          const source = await getSource(input, sources, importMap);
          const result = await loader.fn(input, source, { importMap });
          const imports = Object.entries(result.imports || {}).reduce(
            (object, [specifier, value]) => {
              object[removeRelativePrefix(specifier)] = value;
              return object;
            },
            {} as Imports,
          );
          const exports = Object.entries(result.exports || {}).reduce(
            (object, [specifier, value]) => {
              object[removeRelativePrefix(specifier)] = value;
              return object;
            },
            {} as Exports,
          );

          entry = graph[input] = {
            path: result.path || resolvedPath,
            output: result.output || getOutput(input, fileMap, baseURL),
            imports: imports,
            exports: exports,
          };
          for (const dependency of Object.keys(entry.imports)) {
            queue.push(dependency);
          }
          for (const dependency of Object.keys(entry.exports)) {
            queue.push(dependency);
          }
          continue loop;
        }
      }
      throw Error(`no loader for '${input}' was found`);
    }
  }

  return graph;
}
