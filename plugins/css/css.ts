import { fs, path, postcss, postcssPresetEnv, Sha256 } from "../../deps.ts";

import {
  Chunk,
  ChunkList,
  Context,
  Dependencies,
  Format,
  Item,
  Plugin,
} from "../plugin.ts";
import { postcssExtractDependenciesPlugin } from "./postcss/extract_dependencies.ts";
import { resolve as resolveCache } from "../../cache.ts";
import { postcssInjectImportsPlugin } from "./postcss/inject_imports.ts";
import { postcssInjectDependenciesPlugin } from "./postcss/inject_dependencies.ts";
import { getAsset } from "../../graph.ts";
import { readTextFile } from "../../_util.ts";
export class CssPlugin extends Plugin {
  use: postcss.AcceptedPlugin[];
  constructor(
    { use = [] }: {
      use?: postcss.AcceptedPlugin[];
    } = {},
  ) {
    super();
    this.use = use;
  }
  async test(item: Item) {
    const input = item.history[0];
    return input.endsWith(".css");
  }
  async transformSource(
    bundleInput: string,
    chunk: Chunk,
    context: Context,
  ) {
    const { graph, bundler } = context;
    const asset = getAsset(graph, bundleInput, chunk.type);
    const bundleOutput = asset.output;

    const processor = postcss.default([
      ...this.use,
      postcssInjectImportsPlugin(chunk, context, this.use),
      postcssInjectDependenciesPlugin(bundleInput, bundleOutput, context),
    ]);

    const source = await bundler.readSource(chunk, context);

    const { css } = await processor.process(source as string);

    return css;
  }
  async readSource(filePath: string) {
    return await readTextFile(filePath);
  }
  async createAsset(
    item: Item,
    context: Context,
  ) {
    const input = item.history[0];

    const { bundler, importMap, outputMap, depsDirPath } = context;
    const dependencies: Dependencies = { imports: {}, exports: {} };
    const use = [
      ...this.use,
      postcssExtractDependenciesPlugin(dependencies)(
        input,
        { importMap },
      ),
    ];
    const source = await bundler.readSource(item, context);
    const processor = postcss.default(use);

    // TODO store AST to avoid re-parsing in other plugins
    await processor.process(source as string);

    const extension = path.extname(input);

    return {
      filePath: input,
      output: outputMap[input] ||
        path.join(
          depsDirPath,
          `${new Sha256().update(input).hex()}${extension}`,
        ),
      dependencies,
      format: Format.Style,
    };
  }
  async createChunk(
    item: Item,
    context: Context,
    chunkList: ChunkList,
  ) {
    const rootInput = item.history[0];

    const { graph } = context;
    const dependencyList = [item];

    for (const dependencyItem of dependencyList) {
      const { history, type } = dependencyItem;
      const input = history[0];

      const asset = getAsset(graph, input, type);
      if (
        input === rootInput || asset.format === Format.Style
      ) {
      } else {
        chunkList.push(dependencyItem);
      }
      Object.entries(asset.dependencies.imports).forEach(
        ([dependency, { type, format }]) => {
          if (dependency && dependency !== input) {
            dependencyList.push({
              history: [dependency, ...history],
              type,
              format,
            });
          }
        },
      );
      Object.entries(asset.dependencies.exports).forEach(
        ([dependency, { type, format }]) => {
          if (dependency && dependency !== input) {
            dependencyList.push({
              history: [dependency, ...history],
              type,
              format,
            });
          }
        },
      );
    }

    return {
      ...item,
      dependencies: dependencyList,
    };
  }
  async createBundle(
    chunk: Chunk,
    context: Context,
  ) {
    const { graph, bundler, reload } = context;

    let needsBundleUpdate = false;

    const bundleInput = chunk.history[0];

    for (const dependencyItem of chunk.dependencies) {
      const { history } = dependencyItem;
      const input = history[0];
      const resolvedFilePath = resolveCache(input);
      const needsReload = reload === true ||
        Array.isArray(reload) && reload.includes(input);
      const needsUpdate = needsReload ||
        !await bundler.hasCache(bundleInput, resolvedFilePath, context);

      if (needsUpdate) {
        needsBundleUpdate = true;
        const source = await bundler
          .transformSource(
            bundleInput,
            dependencyItem,
            context,
          ) as string;

        await bundler.setCache(
          bundleInput,
          resolvedFilePath,
          source,
          context,
        );
      } else {
        context.sources[resolvedFilePath] = await bundler.getCache(
          bundleInput,
          resolvedFilePath,
          context,
        );
      }
    }
    const bundleAsset = getAsset(graph, bundleInput, chunk.type);
    if (!needsBundleUpdate && await fs.exists(bundleAsset.output)) {
      return;
    }

    let source = await bundler.getCache(
      bundleInput,
      bundleInput,
      context,
    ) as string;

    return source;
  }
}
