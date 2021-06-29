import { fs, path, postcss, Sha256 } from "../../deps.ts";

import {
  Chunk,
  Context,
  DependencyType,
  Format,
  getFormat,
  Item,
  ModuleData,
  Plugin,
} from "../plugin.ts";
import { postcssExtractDependenciesPlugin } from "./postcss/extract_dependencies.ts";
import { resolve as resolveCache } from "../../cache/cache.ts";
import { postcssInjectImportsPlugin } from "./postcss/inject_imports.ts";
import { postcssInjectDependenciesPlugin } from "./postcss/inject_dependencies.ts";
import { Asset, getAsset } from "../../graph.ts";
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
  test(item: Item) {
    const input = item.history[0];
    return input.endsWith(".css");
  }
  async transformSource(
    bundleInput: string,
    item: Item,
    context: Context,
  ) {
    const { graph, bundler } = context;
    const asset = getAsset(graph, bundleInput, item.type);
    const bundleOutput = asset.output;

    // replace necessary @import rules with content
    const injectImportsProcessor = postcss.default([
      ...this.use,
      postcssInjectImportsPlugin(item, context, this.use),
    ]);
    const source = await bundler.readSource(item, context);
    const { css: injectedImportsCss } = await injectImportsProcessor.process(
      source as string,
    );

    // Replace all dependencies. Must be as a second step to avoid invalid asset paths
    const injectDependenciesProcessor = await postcss.default([
      postcssInjectDependenciesPlugin(bundleInput, bundleOutput, context),
    ]);
    const { css: injectedDependenciesCss } = injectDependenciesProcessor
      .process(
        injectedImportsCss,
      );
    return injectedDependenciesCss;
  }
  async readSource(input: string) {
    return await readTextFile(input);
  }
  async createAsset(
    item: Item,
    context: Context,
  ) {
    const input = item.history[0];

    const { bundler, importMap, outputMap, depsDirPath } = context;
    const moduleData: ModuleData = { dependencies: {}, export: {} };
    const use = [
      ...this.use,
      postcssExtractDependenciesPlugin(moduleData)(
        input,
        { importMap },
      ),
    ];
    const source = await bundler.readSource(item, context);
    const processor = postcss.default(use);

    // TODO store AST to avoid re-parsing in other plugins
    try {
      await processor.process(source as string);
    } catch (error) {
      throw new Error(`${input}: ${error.message}`);
    }

    const extension = path.extname(input);

    return {
      input,
      output: outputMap[input] ||
        path.join(
          depsDirPath,
          `${new Sha256().update(input).hex()}${extension}`,
        ),
      export: moduleData.export,
      dependencies: moduleData.dependencies,
      type: item.type,
    } as Asset;
  }
  createChunk(
    item: Item,
    context: Context,
    chunkList: Item[],
  ) {
    const dependencyItems: Item[] = [];
    const chunkInput = item.history[0];
    const asset = getAsset(context.graph, chunkInput, item.type);

    for (const [input, types] of Object.entries(asset.dependencies)) {
      Object.keys(types).forEach((type) => {
        const newItem: Item = {
          history: [input, ...item.history],
          type: type as DependencyType,
        };
        dependencyItems.push(newItem);
        if (
          input !== chunkInput && getFormat(input) !== Format.Style
        ) {
          chunkList.push(newItem);
        }
      });
    }

    return {
      item,
      dependencyItems,
    };
  }
  async createBundle(
    chunk: Chunk,
    context: Context,
  ) {
    const { graph, bundler, reload } = context;

    let needsBundleUpdate = false;
    const bundleItem = chunk.item;
    const bundleInput = bundleItem.history[0];

    for (const dependencyItem of [chunk.item, ...chunk.dependencyItems]) {
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

    const bundleAsset = getAsset(graph, bundleInput, bundleItem.type);
    if (!needsBundleUpdate && await fs.exists(bundleAsset.output)) {
      return;
    }

    const source = await bundler.getCache(
      bundleInput,
      bundleInput,
      context,
    ) as string;

    return source;
  }
}
