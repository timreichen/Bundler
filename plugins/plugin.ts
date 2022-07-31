import { Bundler } from "../bundler.ts";
import { colors, ImportMap } from "../deps.ts";
import { timestamp } from "../_util.ts";

export enum DependencyType {
  ImportExport = "ImportExport",
  DynamicImport = "DynamicImport",
  Fetch = "Fetch",
  WebWorker = "WebWorker",
  ServiceWorker = "ServiceWorker",
  WebManifest = "WebManifest",
}
export enum DependencyFormat {
  Unknown = "Unknown",
  Html = "Html",
  Style = "Style",
  Script = "Script",
  Json = "Json",
  Wasm = "Wasm",
  Binary = "Binary",
}

export interface DependencyInfo {
  specifiers?: Record<string, string>;
  default?: string | boolean;
  namespaces?: string[];
  types?: Record<string, string>;
}

export interface Dependency extends DependencyInfo {
  input: string;
  type: DependencyType;
  format: DependencyFormat;
}

export interface DependencyData {
  dependencies: Dependency[];
  exports: DependencyInfo;
}

export interface Item {
  input: string;
  type: DependencyType;
  format: DependencyFormat;
}

export interface ChunkItem extends Item {
  source: Source;
}

export interface Asset extends ChunkItem, DependencyData {
}

export interface Chunk {
  item: ChunkItem;
  output: string;
  dependencyItems: ChunkItem[];
}

export interface Bundle {
  output: string;
  source: Source;
}

interface Context {
  bundler: Bundler;
}

export interface CreateAssetsContext extends Context {
  importMap?: ImportMap;
  reload?: boolean | string[];
  assets?: Asset[];
}
export interface CreateAssetContext extends CreateAssetsContext {
  assets: Asset[];
}

export interface CreateChunksContext extends Context {
  importMap?: ImportMap;
  outputMap: Record<string, string>;
  root: string;
  chunks?: Chunk[];
}
export interface CreateChunkContext extends CreateChunksContext {
  assets: Asset[];
  // removeAssertClauses?: boolean
}

export interface CreateBundlesContext extends Context {
  root: string;
  importMap?: ImportMap;
  optimize?: boolean;
  chunks?: Chunk[];
}

export interface CreateBundleContext extends CreateBundlesContext {
  chunks: Chunk[];
}

// deno-lint-ignore no-empty-interface
export interface OptimizeBundleContext {
}

export type Source = ArrayBuffer | string;

const encoder = new TextEncoder();

export abstract class Plugin {
  constructor() {
  }

  async createOutput(input: string, root: string, extension: string) {
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(input),
    );

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    if (!root.endsWith("/")) {
      root = `${root}/`;
    }

    return new URL(`${hex}${extension}`, new URL(root, "file://")).href;
  }

  protected async readSource(
    input: string,
    _context: CreateAssetContext,
  ): Promise<Source> {
    return await Deno.readFile(input);
  }

  async createSource(
    input: string,
    context: CreateAssetContext,
  ): Promise<Source> {
    const time = performance.now();
    const source = await this.readSource(input, context);
    // watchFile(input).then(() => this.cacheSources.delete(input));
    context.bundler.logger.debug(
      colors.yellow("Read"),
      input,
      colors.dim(colors.italic(`(${timestamp(time)})`)),
    );
    return source;
  }

  abstract test(
    input: string,
    type: DependencyType,
    format: DependencyFormat,
  ): Promise<boolean> | boolean;

  getSource?(
    input: string,
    type: DependencyType,
    context: CreateAssetContext,
  ): Promise<Source> | Source;

  createAsset?(
    input: string,
    type: DependencyType,
    context: CreateAssetContext,
  ): Promise<Asset> | Asset;

  splitAssetDependencies(
    _asset: Asset,
    _context: CreateChunkContext,
  ): Promise<Item[]> | Item[] {
    return [];
  }

  createChunk?(
    asset: Asset,
    chunkAssets: Set<Asset>,
    context: CreateChunkContext,
  ): Promise<Chunk> | Chunk;
  createBundle?(
    chunk: Chunk,
    context: CreateBundleContext,
  ): Promise<Bundle> | Bundle;
  optimizeSource?(
    source: Source,
  ): Promise<Source> | Source;
}
