import { Bundler } from "../../bundler.ts";
import { path } from "../../deps.ts";
import { TextFilePlugin } from "../file/text_file.ts";
import {
  CreateAssetOptions,
  CreateBundleOptions,
  CreateChunkOptions,
} from "../plugin.ts";
import {
  Asset,
  Bundle,
  Chunk,
  DependencyFormat,
  DependencyType,
  Source,
} from "../plugin.ts";
import { getDependencyFormat } from "../_util.ts";

export class JSONPlugin extends TextFilePlugin {
  test(input: string, type: DependencyType, format: DependencyFormat) {
    switch (format) {
      case DependencyFormat.Json:
        return type !== DependencyType.WebManifest;
      case DependencyFormat.Unknown:
        return type !== DependencyType.WebManifest &&
          getDependencyFormat(input) === DependencyFormat.Json;
      default:
        return false;
    }
  }

  async createSource(
    input: string,
    bundler?: Bundler | undefined,
    options?: CreateAssetOptions,
  ) {
    const source = await super.createSource(input, bundler, options);
    return JSON.parse(source);
  }

  createAsset(
    input: string,
    type: DependencyType,
    _bundler: Bundler,
    _options: CreateAssetOptions = {},
  ): Promise<Asset> | Asset {
    const format = DependencyFormat.Json;
    return {
      input,
      type,
      format,
      dependencies: [],
    };
  }

  async createChunk(
    asset: Asset,
    _chunkAssets: Set<Asset>,
    _bundler: Bundler,
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
    { optimize }: CreateBundleOptions = {},
  ): Promise<Bundle> | Bundle {
    if (optimize) {
      source = this.optimizeSource(source);
    } else {
      source = JSON.stringify(source, null, " ");
    }
    return {
      source,
      output: chunk.output,
    };
  }

  optimizeSource(source: Source) {
    return JSON.stringify(source);
  }
}
