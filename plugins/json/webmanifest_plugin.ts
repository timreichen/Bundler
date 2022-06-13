import {
  Asset,
  Chunk,
  CreateAssetContext,
  CreateBundleContext,
  DependencyFormat,
  DependencyType,
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
    context: CreateAssetContext,
  ) {
    const asset = await super.createAsset(input, type, context);
    const json = JSON.parse(asset.source as string);
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

  splitAssetDependencies(asset: Asset) {
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

  createBundle(chunk: Chunk, context: CreateBundleContext) {
    const json = JSON.parse(chunk.item.source as string);
    const icons = json.icons || [];

    for (const icon of icons) {
      const resolvedUrl = resolveDependency(chunk.item.input, icon.src);
      const dependencyChunk = getChunk(
        context.chunks,
        resolvedUrl,
        DependencyType.Fetch,
        DependencyFormat.Binary,
      );

      icon.src = createRelativeOutput(dependencyChunk.output, context.root);
    }

    const source = JSON.stringify(json, null, " ");

    const clonedChunk: Chunk = { ...chunk, item: { ...chunk.item, source } };

    return super.createBundle(clonedChunk, context);
  }
}
