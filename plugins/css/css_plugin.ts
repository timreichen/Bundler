import { Bundler } from "../../bundler.ts";
import { colors } from "../../deps.ts";
import { timestamp } from "../../_util.ts";
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
  Item,
  Source,
} from "../plugin.ts";
import { getAsset, getDependencyFormat } from "../_util.ts";
import { extractDependencies } from "./extract_dependencies.ts";
import { injectDependencies } from "./inject_dependencies.ts";
import { parse, stringify, transpile } from "./_util.ts";

export class CSSPlugin extends TextFilePlugin {
  test(input: string, _type: DependencyType, format: DependencyFormat) {
    switch (format) {
      case DependencyFormat.Style:
        return true;
      case DependencyFormat.Unknown:
        return getDependencyFormat(input) === DependencyFormat.Style;
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
    const time = performance.now();
    let ast = parse(source);
    ast = await transpile(ast);
    bundler?.logger.debug(
      colors.yellow("Transpile"),
      `postcss → css`,
      input,
      colors.dim(colors.italic(`(${timestamp(time)})`)),
    );
    return ast;
  }

  async createAsset(
    input: string,
    type: DependencyType,
    bundler: Bundler,
    options: CreateAssetOptions = {},
  ): Promise<Asset> {
    const format = DependencyFormat.Style;

    const source = await bundler.createSource(input, type, format, options);

    const dependencies = await this.createDependencies(
      input,
      type,
      format,
      source,
      options,
    );

    return {
      input,
      type,
      format,
      dependencies,
    };
  }

  async createDependencies(
    input: string,
    _type: DependencyType,
    _format: DependencyFormat,
    source: Source,
    { importMap }: CreateAssetOptions = {},
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
    for (const dependency of asset.dependencies) {
      const { input, type, format } = dependency;
      switch (dependency.format) {
        case DependencyFormat.Style: {
          break;
        }
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
    chunkAssets: Set<Asset>,
    _bundler?: Bundler,
    { assets = [], root = ".", outputMap }: CreateChunkOptions = {},
  ) {
    const dependencyItems: Item[] = [];
    const dependencies = [...asset.dependencies];
    const checkedAssets = new Set();
    for (const dependency of dependencies) {
      const { input, type, format } = dependency;
      switch (dependency.format) {
        case DependencyFormat.Style: {
          const dependencyAsset = await getAsset(
            assets,
            input,
            type,
            format,
          );
          if (checkedAssets.has(dependencyAsset)) continue;
          checkedAssets.add(dependencyAsset);
          if (!chunkAssets.has(dependencyAsset) && dependencyAsset !== asset) {
            dependencyItems.push({
              input: dependencyAsset.input,
              type: dependencyAsset.type,
              format: dependencyAsset.format,
            });
            dependencies.push(...dependencyAsset.dependencies);
          }
          break;
        }
      }
    }
    return {
      item: {
        input: asset.input,
        type: asset.type,
        format: asset.format,
      },
      dependencyItems,
      output: outputMap?.[asset.input] ??
        await this.createOutput(asset.input, root, ".css"),
    };
  }

  async createBundle(
    chunk: Chunk,
    ast: Source,
    bundler: Bundler,
    { chunks = [], root, importMap }: CreateBundleOptions,
  ) {
    const { input, type, format } = chunk.item;

    const time = performance.now();
    ast = await injectDependencies(
      input,
      ast,
      chunk.dependencyItems,
      chunks,
      bundler,
      { importMap, root },
    );

    bundler?.logger.debug(
      colors.yellow("Inject Dependencies"),
      input,
      colors.dim(type),
      colors.dim(format),
      colors.dim(colors.italic(`(${timestamp(time)})`)),
    );

    return {
      source: stringify(ast),
      output: chunk.output,
    };
  }
}
