import { path } from "../../deps.ts";
import { isURL } from "../../_util.ts";
import {
  Asset,
  Chunk,
  CreateAssetContext,
  CreateBundleContext,
  CreateChunkContext,
  DependencyFormat,
  DependencyType,
  Plugin,
} from "../plugin.ts";

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
    context: CreateAssetContext,
  ) {
    const source = await this.createSource(input, context);
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
      output: context.outputMap[asset.input] ?? await this.createOutput(
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
}
