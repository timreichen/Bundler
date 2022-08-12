import { Bundler } from "../../bundler.ts";
import { TextFilePlugin } from "../file/text_file.ts";
import {
  CreateAssetOptions,
  CreateBundleOptions,
  CreateChunkOptions,
} from "../plugin.ts";
import {
  Asset,
  Chunk,
  DependencyFormat,
  DependencyType,
  getDependencyFormat,
  Item,
  Source,
} from "../_util.ts";
import { extractDependencies } from "./extract_dependencies.ts";
import { injectDependencies } from "./inject_dependencies.ts";
import { parse, stringify } from "./_util.ts";

export class HTMLPlugin extends TextFilePlugin {
  test(input: string, _type: DependencyType, format: DependencyFormat) {
    switch (format) {
      case DependencyFormat.Html:
        return true;
      case DependencyFormat.Unknown:
        return getDependencyFormat(input) === DependencyFormat.Html;
      default:
        return false;
    }
  }

  async createSource(
    input: string,
    bundler?: Bundler,
    { importMap }: CreateAssetOptions = {},
  ) {
    const source = await super.createSource(input, bundler, { importMap });
    return parse(source);
  }

  async createAsset(
    input: string,
    type: DependencyType,
    bundler: Bundler,
    { importMap }: CreateAssetOptions = {},
  ) {
    const format = DependencyFormat.Html;

    const source = await bundler.createSource(input, type, format, {
      importMap,
    });
    const dependencies = await this.createDependencies(input, source, {
      importMap,
    });

    return {
      input,
      type,
      format,
      dependencies,
    };
  }

  async createDependencies(
    input: string,
    source: Source,
    { importMap }: CreateAssetOptions,
  ) {
    const dependencies = await extractDependencies(
      input,
      source,
      { importMap },
    );

    return dependencies;
  }

  splitDependencies(
    asset: Asset,
    _bundler: Bundler,
    _options: CreateChunkOptions,
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
      output: outputMap?.[asset.input] ??
        await this.createOutput(asset.input, root, ".html"),
    };
  }

  async createBundle(
    chunk: Chunk,
    ast: Source,
    bundler: Bundler,
    { chunks = [], root = ".", importMap }: CreateBundleOptions,
  ) {
    const { input } = chunk.item;
    const result = await injectDependencies(
      input,
      chunk.dependencyItems,
      ast,
      chunks,
      bundler,
      { root, importMap },
    );

    return {
      source: stringify(result),
      output: chunk.output,
    };
  }
}
