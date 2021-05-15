import { fs, path, Sha256 } from "../../deps.ts";
import { getAsset } from "../../graph.ts";
import { addRelativePrefix } from "../../_util.ts";
import {
  Chunk,
  ChunkList,
  Context,
  Dependencies,
  DependencyType,
  Format,
  Item,
} from "../plugin.ts";
import { JsonPlugin } from "./json.ts";

export class WebManifestPlugin extends JsonPlugin {
  async test(item: Item, context: Context) {
    return item.format === Format.WebManifest;
  }
  async createAsset(
    item: Item,
    context: Context,
  ) {
    const { bundler, outputMap, depsDirPath } = context;
    const input = item.history[0];
    const dependencies: Dependencies = {
      imports: {},
      exports: {},
    };

    const source = await bundler.readSource(
      item,
      context,
    ) as string;

    const json = JSON.parse(source);

    json.icons?.forEach(({ src }: { src: string }) => {
      const resolvedPath = path.join(path.dirname(input), src);
      dependencies.imports[resolvedPath] = {
        specifiers: {},
        defaults: [],
        namespaces: [],
        types: {},
        type: DependencyType.Import,
        format: Format.Image,
      };
    });

    const extension = path.extname(input);
    return {
      filePath: input,
      output: outputMap[input] ||
        path.join(
          depsDirPath,
          `${new Sha256().update(input).hex()}${extension}`,
        ),
      dependencies,
      format: Format.WebManifest,
    };
  }
  async createChunk(
    item: Item,
    context: Context,
    chunkList: ChunkList,
  ) {
    const { history, type } = item;
    const { graph } = context;
    const input = history[0];
    const asset = getAsset(graph, input, type);
    const { imports, exports } = asset.dependencies;
    const dependencies: Item[] = [item];

    Object.entries(imports).forEach(([dependency, { type, format }]) =>
      chunkList.push({
        history,
        type,
        format,
      })
    );
    Object.entries(exports).forEach(([dependency, { type, format }]) =>
      chunkList.push({
        history,
        type,
        format,
      })
    );

    return {
      ...item,
      dependencies,
    };
  }
  async createBundle(
    chunk: Chunk,
    context: Context,
  ) {
    const input = chunk.history[0];

    const { graph, bundler, reload } = context;

    const asset = getAsset(graph, input, chunk.type);
    const exists = await fs.exists(asset.output);
    const needsUpdate = reload || !exists ||
      Deno.statSync(asset.output).mtime! <
        Deno.statSync(asset.filePath).mtime!;

    if (!needsUpdate) return;
    const bundleOutput = path.dirname(asset.output);

    const source = await bundler.readSource(
      chunk,
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
