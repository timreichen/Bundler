import { path } from "../deps.ts";
import { Bundler } from "../bundler.ts";
import { Asset, Graph } from "../graph.ts";
import { isURL } from "../_util.ts";
import { Logger } from "../logger.ts";

export enum DependencyType {
  Import = "Import",
  DynamicImport = "DynamicImport",
  Fetch = "Fetch",
  WebWorker = "WebWorker",
  ServiceWorker = "ServiceWorker",
  WebManifest = "WebManifest",
}

export enum Format {
  Html = "Html",
  Style = "Style",
  Script = "Script",
  Json = "Json",
  Image = "Image",
  Wasm = "Wasm",
}

/**
 * get Format based on file extension
 */
export function getFormat(input: string) {
  const extension = path.extname(input);

  switch (true) {
    case extension.endsWith(".html"): {
      return Format.Html;
    }
    case extension.endsWith(".css"): {
      return Format.Style;
    }
    case extension.endsWith(".json"): {
      return Format.Json;
    }
    case extension.endsWith(".wasm"): {
      return Format.Wasm;
    }
    case /\.(png|jpe?g|ico|gif|svg)$/.test(input): {
      return Format.Image;
    }
    case /\.(t|j)sx?$/.test(input) ||
      (isURL(input) && !/([\.][a-zA-Z]\w*)$/.test(input)): {
      return Format.Script;
    }
  }
  // throw new Error(`No format for extension found: '${extension}'`);
}

export type History = string[];

export type Source = unknown;
export type Sources = Record<string, Source>;

export type Bundles = Record<string, Source>;
export type OutputMap = Record<string, string>;

export interface Item {
  history: History;
  type: DependencyType;
}
export interface Chunk {
  item: Item;
  dependencyItems: Item[];
}

export type Chunks = Chunk[];
export type Cache = Record<string, string>;

interface Specifiers {
  specifiers?: Record<
    string, /* identifier */
    string /* specifier */
  >; /* example: import { x as y } from "./x.ts" -> { y: "x" } */
  namespaces?: string[];
  types?: Record<string, string>;
}
export interface Import extends Specifiers {
  defaults?: string[];
}
export interface Export extends Specifiers {
  default?: string | boolean;
}
export type Dependencies = Record<
  string, /* input */
  Partial<Record<keyof typeof DependencyType, Import>>
>;

export interface ModuleData {
  dependencies: Dependencies;
  export: Export;
}

export type Context = {
  importMap: Deno.ImportMap;
  cacheDirPath: string;
  depsDirPath: string;
  outDirPath: string;
  reload: boolean | string[];
  optimize: boolean;
  quiet: boolean;
  outputMap: OutputMap;
  includeTypeOnly?: boolean;

  graph: Graph;
  chunks: Chunks;
  bundles: Bundles;

  sources: Sources;
  cache: Cache;

  logger: Logger;

  bundler: Bundler;
};

export interface Plugin {
  test(item: Item, context: Context): Promise<boolean> | boolean;
  readSource?(
    input: string,
    context: Context,
  ): Promise<Source> | Source;
  prepareSource?(input: string, context: Context): Promise<Source> | Source;
  transformSource?(
    bundleInput: string,
    item: Item,
    context: Context,
  ): Promise<Source> | Source;
  createAsset?(
    item: Item,
    context: Context,
  ): Promise<Asset> | Asset;
  createChunk?(
    item: Item,
    context: Context,
    chunkList: Item[],
  ): Promise<Chunk> | Chunk;
  createBundle?(
    chunk: Chunk,
    context: Context,
  ): Promise<Source | void> | Source | void;
  optimizeBundle?(
    output: string,
    context: Context,
  ): Promise<Source> | Source;
}

export class Plugin {
}
