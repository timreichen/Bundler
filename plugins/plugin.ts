import { Bundler } from "../bundler.ts";
import { Asset, Graph } from "../graph.ts";
import { Chunk } from "../chunk.ts";

export type Chunks = Map<string, Chunk>;

export type Bundle = Source;
export type Source = string | Uint8Array;
export type Bundles = Record<string, Bundle>;

export type TestFunction = (
  input: string,
  data: Data,
) => Promise<boolean> | boolean;

export type Data = {
  graph: Graph;
  chunks: Chunks;
  bundler: Bundler;
  reload: boolean;
  optimize: boolean;
};

export interface Plugin {
  load?(
    filePath: string,
    data: Data,
  ): Promise<Source>;
  createAsset?(
    input: string,
    data: Data,
  ): Promise<Asset>;
  createChunk?(
    inputHistory: string[],
    chunkList: string[][],
    data: Data,
  ): Promise<Chunk>;
  createBundle?(
    chunk: Chunk,
    data: Data,
  ): Promise<Bundle | undefined>;
  transform?(
    input: string,
    source: Source,
    bundleInput: string,
    data: Data,
  ): Promise<Source>;
  optimize?(
    input: string,
    bundles: Bundles,
    data: Data,
  ): Promise<Source>;
}

export class Plugin {
  testFn: TestFunction;
  constructor(
    { test = () => true }: {
      test?: TestFunction;
    } = {},
  ) {
    this.testFn = test;
  }
  async test(
    input: string,
    data: Data,
  ) {
    return this.testFn(input, data);
  }
}
