import { path } from "../deps.ts";
import { Bundler } from "../bundler.ts";
import { Asset, Graph } from "../graph.ts";
import { isURL } from "../_util.ts";
import { Logger } from "../logger.ts";

export enum DependencyType {
  Import = "Import",
  Export = "Export",

  DynamicImport = "DynamicImport",
  Fetch = "Fetch",
  WebWorker = "WebWorker",
  ServiceWorker = "ServiceWorker",
}

export enum Format {
  Unknown = 1 << 0,
  Html = 1 << 1,
  Style = 1 << 2,
  Script = 1 << 3,
  Json = 1 << 4,
  WebManifest = Json | 1 << 5,
  Image = 1 << 6,
  Wasm = 1 << 7,
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

export type ChunkList = Item[];

export interface Item {
  history: History;
  type: DependencyType;
  format: Format;
}
export interface Chunk {
  item: Item;
  dependencyItems: Item[];
}

export type Chunks = Chunk[];
export type Cache = Record<string, string>;

export type Dependency = {
  specifiers: Record<string, string>; /*
   key is identifier, value is specifier -> `import { x as y } from ".x/ts"` should be set as { y: "x" }
   */
  defaults: string[];
  namespaces: (string | undefined)[];
  types: Record<string, string>;
  type: DependencyType;
  format: Format;
};

export type Dependencies = {
  imports: Record<
    string,
    Dependency
  >;
  exports: Record<
    string,
    Dependency
  >;
};

export type Context = {
  importMap: Deno.ImportMap;
  cacheDirPath: string;
  depsDirPath: string;
  outDirPath: string;
  reload: boolean | string[];
  optimize: boolean;
  quiet: boolean;
  outputMap: OutputMap;

  graph: Graph;
  chunks: Chunks;
  bundles: Bundles;

  sources: Sources;
  cache: Cache;

  logger: Logger;

  bundler: Bundler;
};

export interface Plugin {
  test(item: Item, context: Context): Promise<boolean>;
  readSource?(
    input: string,
    context: Context,
  ): Promise<Source>;
  transformSource?(
    bundleInput: string,
    item: Item,
    context: Context,
  ): Promise<Source>;
  createAsset?(
    item: Item,
    context: Context,
  ): Promise<Asset>;
  createChunk?(
    item: Item,
    context: Context,
    chunkList: ChunkList,
  ): Promise<Chunk>;
  splitChunks?(item: Item, context: Context): Promise<Item[]>;

  createBundle?(
    chunk: Chunk,
    context: Context,
  ): Promise<Source | void>;
  optimizeBundle?(
    output: string,
    context: Context,
  ): Promise<Source>;
}

export class Plugin {
  async test(item: Item, context: Context) {
    return false;
  }
}
