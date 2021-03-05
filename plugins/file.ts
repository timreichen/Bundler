import { path, Sha256 } from "../deps.ts";
import { Asset, getAsset } from "../graph.ts";
import {
  Chunk,
  ChunkList,
  Context,
  getFormat,
  Item,
  Plugin,
  Source,
} from "./plugin.ts";

export class FilePlugin extends Plugin {
  async readSource(filePath: string, context: Context): Promise<Source> {
    return await Deno.readFile(filePath);
  }
  async createAsset(
    item: Item,
    context: Context,
  ): Promise<Asset> {
    const { outputMap, depsDirPath } = context;
    const input = item.history[0];
    const extension = path.extname(input);

    return {
      filePath: input,
      output: outputMap[input] ||
        path.join(
          depsDirPath,
          `${new Sha256().update(input).hex()}${extension}`,
        ),
      dependencies: { imports: {}, exports: {} },
      format: getFormat(input) || null,
    };
  }
  async createChunk(
    item: Item,
    context: Context,
    chunkList: ChunkList,
  ): Promise<Chunk> {
    return {
      ...item,
      dependencies: [],
    };
  }
  async createBundle(
    chunk: Chunk,
    context: Context,
  ): Promise<Source | void> {
    const { bundler, reload, graph } = context;
    const { history, type } = chunk;
    const input = history[0];
    const asset = getAsset(graph, type, input);

    const { filePath, output } = asset;
    try {
      const bundleNeedsUpdate = reload == true ||
        (Array.isArray(reload) && reload.includes(input)) ||
        Deno.statSync(output).mtime! < Deno.statSync(filePath).mtime!;
      if (!bundleNeedsUpdate) return;
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
    }
    return await bundler.readSource(chunk, context);
  }
}
