import { Bundler } from "../../bundler.ts";
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
  Source,
} from "../plugin.ts";
import { createRelativeOutput, getChunk, resolveDependency } from "../_util.ts";
import { JSONPlugin } from "./json_plugin.ts";

export class WebManifestPlugin extends JSONPlugin {
  test(_input: string, type: DependencyType) {
    return type === DependencyType.WebManifest;
  }

  async createAsset(
    input: string,
    type: DependencyType,
    bundler: Bundler,
    options: CreateAssetOptions = {},
  ) {
    const asset = await super.createAsset(input, type, bundler, options);
    const json = await bundler.createSource(
      input,
      type,
      asset.format,
      options,
    );
    const icons = json.icons || [];
    for (const icon of icons) {
      const resolvedUrl = resolveDependency(input, icon.src);
      asset.dependencies.push({
        input: resolvedUrl,
        type: DependencyType.Fetch,
        format: DependencyFormat.Binary,
      });
    }
    return asset;
  }

  splitDependencies(
    asset: Asset,
    _bundler: Bundler,
    _options: CreateChunkOptions,
  ) {
    const items = [];

    for (const dependency of asset.dependencies) {
      items.push({
        input: dependency.input,
        type: dependency.type,
        format: dependency.format,
      });
    }

    return items;
  }

  async createBundle(
    chunk: Chunk,
    source: Source,
    bundler: Bundler,
    { chunks = [], root = ".", importMap, optimize }: CreateBundleOptions = {},
  ) {
    const icons = source.icons || [];

    for (const icon of icons) {
      const resolvedUrl = resolveDependency(chunk.item.input, icon.src);

      const dependencyChunk = getChunk(
        chunks,
        resolvedUrl,
        DependencyType.Fetch,
        DependencyFormat.Binary,
      );

      icon.src = createRelativeOutput(dependencyChunk.output, root);
    }

    return await super.createBundle(chunk, source, bundler, {
      chunks,
      root,
      importMap,
      optimize,
    });
  }
}
