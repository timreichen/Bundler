import { path } from "../../deps.ts";
import { TextFilePlugin } from "../file/text_file.ts";
import {
  Asset,
  Chunk,
  CreateAssetContext,
  CreateBundleContext,
  CreateChunkContext,
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

  async createAsset(
    input: string,
    type: DependencyType,
    context: CreateAssetContext,
  ): Promise<Asset> {
    const source = await this.createSource(input, context);
    return {
      input: input,
      type,
      format: DependencyFormat.Json,
      dependencies: [],
      exports: {},
      source,
    };
  }

  async createChunk(
    asset: Asset,
    _chunkAssets: Set<Asset>,
    context: CreateChunkContext,
  ) {
    return {
      item: {
        input: asset.input,
        type: asset.type,
        format: asset.format,
        source: asset.source,
      },
      dependencyItems: [],
      output: context.outputMap[asset.input] || await this.createOutput(
        asset.input,
        context.root,
        path.extname(asset.input),
      ),
    };
  }

  createBundle(chunk: Chunk, _context: CreateBundleContext) {
    const { source } = chunk.item;
    return {
      source,
      output: chunk.output,
    };
  }

  optimizeSource(source: Source) {
    return JSON.stringify(JSON.parse(source as string));
  }
}
