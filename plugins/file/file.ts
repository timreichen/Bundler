import { Bundler } from "../../bundler.ts";
import { path } from "../../deps.ts";
import { isURL } from "../../_util.ts";
import {
  CreateAssetOptions,
  CreateBundleOptions,
  CreateChunkOptions,
  Plugin,
} from "../plugin.ts";
import {
  Asset,
  Chunk,
  DependencyFormat,
  DependencyType,
  Source,
} from "../_util.ts";

export class FilePlugin extends Plugin {
  test(_input: string, _type: DependencyType, _format: DependencyFormat) {
    return true;
  }
  async readSource(input: string) {
    try {
      if (isURL(input)) {
        return await fetch(input)
          .then((res) => res.arrayBuffer());
      }
      return await Deno.readFile(input);
    } catch (error) {
      console.error(`file not found: ${input}`);
      throw error;
    }
  }

  async createAsset(
    input: string,
    type: DependencyType,
    bundler: Bundler,
    options: CreateAssetOptions,
  ) {
    const source = await this.createSource(input, bundler, options);
    return {
      input: input,
      type,
      format: DependencyFormat.Binary,
      dependencies: [],
      exports: {},
      source,
    };
  }

  async createChunk(
    asset: Asset,
    _chunkAssets: Set<Asset>,
    _bundler?: Bundler,
    { root = ".", outputMap }: CreateChunkOptions = {},
  ) {
    return {
      item: {
        input: asset.input,
        type: asset.type,
        format: asset.format,
      },
      dependencyItems: [],
      output: outputMap?.[asset.input] ?? await this.createOutput(
        asset.input,
        root,
        path.extname(asset.input),
      ),
    };
  }

  createBundle(
    chunk: Chunk,
    source: Source,
    _bundler: Bundler,
    _options: CreateBundleOptions,
  ) {
    return {
      source,
      output: chunk.output,
    };
  }
}
