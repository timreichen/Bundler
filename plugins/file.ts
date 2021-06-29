// deno-lint-ignore-file require-await
import { path, Sha256 } from "../deps.ts";
import { getAsset } from "../graph.ts";
import { readFile } from "../_util.ts";
import { Chunk, Context, Item, Plugin, Source } from "./plugin.ts";

export class FilePlugin extends Plugin {
  readSource(input: string): Promise<Source> {
    return readFile(input);
  }
  async createAsset(
    item: Item,
    context: Context,
  ) {
    const { outputMap, depsDirPath } = context;
    const { history, type } = item;
    const input = history[0];
    const extension = path.extname(input);

    return {
      input,
      output: outputMap[input] ||
        path.join(
          depsDirPath,
          `${new Sha256().update(input).hex()}${extension}`,
        ),
      dependencies: {},
      export: {},
      type,
    };
  }
  createChunk(
    item: Item,
    _context: Context,
    _chunkList: Item[],
  ) {
    return {
      item,
      dependencyItems: [],
    };
  }
  async createBundle(
    chunk: Chunk,
    context: Context,
  ): Promise<Source | void> {
    const { bundler, reload, graph } = context;
    const item = chunk.item;
    const { history, type } = item;
    const bundleInput = history[0];
    const bundleAsset = getAsset(graph, bundleInput, type);

    const { input, output } = bundleAsset;
    try {
      const bundleNeedsUpdate = reload == true ||
        (Array.isArray(reload) && reload.includes(bundleInput)) ||
        Deno.statSync(output).mtime! < Deno.statSync(input).mtime!;
      if (!bundleNeedsUpdate) return;
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
    }
    return await bundler.readSource(item, context);
  }
}
