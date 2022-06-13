import { TextFilePlugin } from "../file/text_file.ts";
import {
  Asset,
  Chunk,
  ChunkItem,
  CreateAssetContext,
  CreateBundleContext,
  CreateChunkContext,
  DependencyFormat,
  DependencyType,
  Item,
} from "../plugin.ts";
import { extractDependencies } from "./posthtml/extract_dependencies.ts";
import { injectDependencies } from "./posthtml/inject_dependencies.ts";

export class HTMLPlugin extends TextFilePlugin {
  test(input: string, _type: DependencyType) {
    return input.endsWith(".html");
  }
  // async transformSource(
  //   input: string,
  //   source: string
  // ) {
  //   const { html } = await posthtml([
  //     posthtmlInjectDependenciesPlugin(input),
  //   ])
  //     .process(source);
  //   return html;
  // }

  async createAsset(
    input: string,
    type: DependencyType,
    context: CreateAssetContext,
  ) {
    const source = await this.createSource(input, context) as string;
    const dependencies = await extractDependencies(input, source);

    return {
      input,
      type,
      format: DependencyFormat.Html,
      dependencies,
      exports: {},
      source,
    };
  }

  splitAssetDependencies(
    asset: Asset,
    _context: CreateChunkContext,
  ) {
    const items: Item[] = [];
    for (const { input, type, format } of asset.dependencies) {
      switch (format) {
        default: {
          items.push({ input, type, format });
          continue;
        }
      }
    }
    return items;
  }

  async createChunk(
    asset: Asset,
    _chunkAssets: Set<Asset>,
    context: CreateChunkContext,
  ) {
    const dependencyItems: ChunkItem[] = [];
    return {
      item: {
        input: asset.input,
        type: asset.type,
        format: asset.format,
        source: asset.source,
      },
      dependencyItems,
      output: context.outputMap[asset.input] ||
        await this.createOutput(asset.input, context.root, ".html"),
    };
  }

  async createBundle(chunk: Chunk, context: CreateBundleContext) {
    const source = chunk.item.source as string;
    const result = await injectDependencies(chunk.item.input, source, context);
    return {
      source: result,
      output: chunk.output,
    };
  }
}
