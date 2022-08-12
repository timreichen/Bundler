import { Bundler } from "../bundler.ts";
import { ImportMap, ts } from "../deps.ts";
import {
  Asset,
  Bundle,
  Chunk,
  DependencyFormat,
  DependencyType,
  Item,
  Source,
} from "./_util.ts";

export { DependencyFormat, DependencyType };
export type { Asset, Bundle, Chunk, Item, Source };

export interface CreateAssetOptions {
  importMap?: ImportMap;
  reload?: boolean;
}

export interface CreateChunkOptions {
  root?: string;
  assets?: Asset[];
  outputMap?: Record<string, string>;
}

export interface CreateBundleOptions {
  root?: string;
  chunks?: Chunk[];
  importMap?: ImportMap;
  reload?: boolean;
  optimize?: boolean;
  compilerOptions?: ts.CompilerOptions;
}

const encoder = new TextEncoder();

export abstract class Plugin {
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

  abstract test(
    input: string,
    type: DependencyType,
    format: DependencyFormat,
  ): Promise<boolean> | boolean;

  async readSource(
    input: string,
    _bundler?: Bundler,
    _options: CreateAssetOptions = {},
  ): Promise<Source> {
    return await Deno.readFile(input);
  }

  async createSource(
    input: string,
    bundler?: Bundler,
    options: CreateAssetOptions = {},
  ): Promise<Source> {
    return await this.readSource(input, bundler, options);
  }

  splitDependencies(
    _asset: Asset,
    _bundler: Bundler,
    _options: CreateChunkOptions,
  ): Promise<Item[]> | Item[] {
    return [];
  }

  createAsset?(
    input: string,
    type: DependencyType,
    bundler?: Bundler,
    options?: CreateAssetOptions,
  ): Promise<Asset> | Asset;

  createChunk?(
    asset: Asset,
    chunkAssets: Set<Asset>,
    bundler?: Bundler,
    options?: CreateChunkOptions,
  ): Promise<Chunk> | Chunk;

  createBundle?(
    chunk: Chunk,
    source: Source,
    bundler?: Bundler,
    options?: CreateBundleOptions,
  ): Promise<Bundle> | Bundle;

  optimizeBundle?(
    source: Source,
  ): Promise<Source> | Source;
}
