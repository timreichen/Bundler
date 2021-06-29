// deno-lint-ignore-file no-explicit-any
import { fs, path } from "../../deps.ts";
import { getAsset } from "../../graph.ts";
import { addRelativePrefix } from "../../_util.ts";
import { Chunk, Context, DependencyType, Item, ModuleData } from "../plugin.ts";
import { JsonPlugin } from "./json.ts";

export class WebManifestPlugin extends JsonPlugin {
  test(item: Item) {
    return item.type === DependencyType.WebManifest;
  }
  async createAsset(
    item: Item,
    context: Context,
  ) {
    const { bundler } = context;
    const input = item.history[0];

    const source = await bundler.readSource(
      item,
      context,
    ) as string;

    const json = JSON.parse(source);

    const moduleData: ModuleData = { dependencies: {}, export: {} };

    json.icons?.forEach(({ src }: { src: string }) => {
      const resolvedPath = path.join(path.dirname(input), src);
      moduleData.dependencies[resolvedPath] = {
        [DependencyType.Import]: {},
      };
    });

    return {
      ...await super.createAsset(item, context),
      dependencies: moduleData.dependencies,
      export: moduleData.export,
    };
  }
  createChunk(
    item: Item,
    context: Context,
    chunkList: Item[],
  ) {
    const chunkInput = item.history[0];
    const { graph } = context;

    const asset = getAsset(graph, chunkInput, item.type);

    Object.entries(asset.dependencies).forEach(([dependency, dependencies]) => {
      Object.keys(dependencies).forEach((type) => {
        const newItem: Item = {
          history: [dependency, ...item.history],
          type: type as DependencyType,
        };
        chunkList.push(newItem);
      });
    });

    return {
      item,
      dependencyItems: [],
    };
  }
  async createBundle(
    chunk: Chunk,
    context: Context,
  ) {
    const item = chunk.item;
    const input = item.history[0];

    const { graph, bundler, reload } = context;

    const asset = getAsset(graph, input, item.type);
    const exists = await fs.exists(asset.output);

    const needsUpdate = reload || !exists ||
      Deno.statSync(asset.output).mtime! <
        Deno.statSync(asset.input).mtime!;

    if (!needsUpdate) return;
    const bundleOutput = path.dirname(asset.output);

    const source = await bundler.readSource(
      item,
      context,
    ) as string;

    const json = JSON.parse(source);

    json.icons?.forEach((item: any) => {
      const resolvedFilePath = path.join(path.dirname(input), item.src);
      const iconAsset = getAsset(
        graph,
        resolvedFilePath,
        DependencyType.Import,
      );

      const relativeOutputFilePath = addRelativePrefix(
        path.relative(bundleOutput, iconAsset.output),
      );
      item.src = relativeOutputFilePath;
    });

    const bundleSource = JSON.stringify(json, null, " ");

    return bundleSource;
  }
}
