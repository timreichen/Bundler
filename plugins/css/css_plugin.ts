import { postcss, postcssPresetEnv } from "../../deps.ts";
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
import { getAsset, getDependencyFormat } from "../_util.ts";
import { extractDependencies } from "./postcss/extract_dependencies.ts";
import {
  postcssInjectDependenciesPlugin,
} from "./postcss/inject_dependencies.ts";
import { postcssInjectSourcesPlugin } from "./postcss/inject_sources.ts";

const postcssPresetEnvPlugin = postcssPresetEnv({
  stage: 2,
  features: { "nesting-rules": true },
}) as postcss.Plugin;

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

  async createAsset(
    input: string,
    type: DependencyType,
    context: CreateAssetContext,
  ) {
    let source = await this.createSource(input, context) as string;
    const { dependencies, exports } = await extractDependencies(
      input,
      source,
      context.importMap,
    );

    const processor = postcss.default([
      postcssPresetEnvPlugin,
    ]);
    const { css: result } = await processor.process(source, { from: input });
    source = result;

    return {
      input,
      type,
      format: DependencyFormat.Style,
      dependencies: dependencies,
      exports: exports,
      source,
    };
  }

  splitAssetDependencies(
    asset: Asset,
    _context: CreateChunkContext,
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
    context: CreateChunkContext,
  ) {
    const dependencyItems: ChunkItem[] = [];
    const dependencies = [...asset.dependencies];
    const checkedAssets = new Set();
    for (const dependency of dependencies) {
      const { input, type, format } = dependency;
      switch (dependency.format) {
        case DependencyFormat.Style: {
          const dependencyAsset = await getAsset(
            context.assets,
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
              source: dependencyAsset.source,
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
        source: asset.source,
      },
      dependencyItems,
      output: context.outputMap[asset.input] ??
        await this.createOutput(asset.input, context.root, ".css"),
    };
  }

  async createBundle(chunk: Chunk, context: CreateBundleContext) {
    const { input, source } = chunk.item;
    const processor = postcss.default([
      postcssInjectSourcesPlugin(chunk, context),
      postcssInjectDependenciesPlugin(input, context),
    ]);
    const { css: result } = await processor.process(source, { from: input });
    return {
      source: result,
      output: chunk.output,
    };
  }
}
