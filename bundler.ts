import {
  Asset,
  Bundle,
  Chunk,
  CreateAssetContext,
  CreateAssetsContext,
  CreateBundleContext,
  CreateBundlesContext,
  CreateChunkContext,
  CreateChunksContext,
  DependencyFormat,
  DependencyType,
  Item,
  Plugin,
  Source,
} from "./plugins/plugin.ts";
import { timestamp } from "./_util.ts";
import { getAsset, getDependencyFormat } from "./plugins/_util.ts";
import { colors } from "./deps.ts";
import { DetailLogger } from "./log/detail_logger.ts";

export class Bundler {
  plugins: Plugin[];
  logger: DetailLogger;
  constructor(
    { plugins, logLevel = DetailLogger.logLevels.trace, quiet = false }: {
      plugins: Plugin[];
      logLevel?: number;
      quiet?: boolean;
    },
  ) {
    this.plugins = plugins;
    this.logger = new DetailLogger(logLevel);
    this.logger.quiet = quiet;
  }

  async createAsset(
    input: string,
    type: DependencyType,
    format: DependencyFormat,
    { assets = [], importMap, reload }: Partial<CreateAssetContext> = {},
  ) {
    const time = performance.now();
    const context = {
      assets,
      importMap,
      reload,
      bundler: this,
    };
    for (const plugin of this.plugins) {
      if (
        plugin.createAsset instanceof Function &&
        await plugin.test(input, type, format)
      ) {
        const asset = await plugin.createAsset(input, type, context);
        for (const dependency of asset.dependencies) {
          this.logger.debug(
            colors.yellow("Dependency"),
            dependency.input,
            colors.dim(dependency.type),
            colors.dim(dependency.format),
          );
        }
        this.logger.info(
          colors.green("Create Asset"),
          input,
          colors.dim(plugin.constructor.name),
          colors.dim(type),
          colors.dim(colors.italic(`(${timestamp(time)})`)),
        );
        return asset;
      }
    }
    throw new Error(`no plugin for 'createAsset' found: ${input} ${type}`);
  }
  async createAssets(
    inputs: string[],
    {
      importMap,
      reload,
      assets: cachedAssets = [],
    }: Partial<CreateAssetsContext> = {},
  ) {
    const time = performance.now();

    const assets: Asset[] = [...cachedAssets];

    const newAssets: Asset[] = [];

    const context: CreateAssetContext = {
      assets,
      importMap,
      reload,
      bundler: this,
    };

    const itemList: Item[] = inputs.map((
      input,
    ) => ({
      input: new URL(input, "file://").href,
      type: DependencyType.ImportExport,
      format: getDependencyFormat(input) || DependencyFormat.Script,
    }));

    const checkedInputs: Record<string, DependencyType[]> = {};

    for (const item of itemList) {
      const { input, type, format } = item;
      const checkedInputTypes = checkedInputs[input] ||= [];
      if (checkedInputTypes.includes(type)) continue;
      checkedInputTypes.push(type);

      let asset = assets.find((asset) =>
        asset.input === input && asset.type === type &&
        asset.format === format
      );

      if (asset) {
        this.logger.info(
          colors.green("Check Asset"),
          input,
          colors.dim(type),
          colors.dim(format),
        );
      } else {
        asset = await this.createAsset(input, type, format, context);
        assets.push(asset);
        newAssets.push(asset);
      }

      for (const dependency of asset.dependencies) {
        itemList.push({
          input: dependency.input,
          type: dependency.type,
          format: dependency.format,
        });
      }
    }

    const length = newAssets.length;

    this.logger.info(
      colors.brightBlue("Create"),
      "Assets",
      colors.dim(
        `${length} file${length === 1 ? "" : "s"}`,
      ),
      colors.dim(colors.italic(`(${timestamp(time)})`)),
    );

    return newAssets;
  }

  async splitAssetDependencies(
    asset: Asset,
    context: CreateChunkContext,
  ) {
    const { input, type, format } = asset;
    for (const plugin of this.plugins) {
      if (
        plugin.splitAssetDependencies instanceof Function &&
        await plugin.test(input, type, format)
      ) {
        const items = await plugin.splitAssetDependencies(
          asset,
          context,
        );
        return items;
      }
    }
    throw new Error(`no plugin for 'createChunk' found: ${input} ${type}`);
  }

  async createChunk(
    asset: Asset,
    chunkAssets: Set<Asset>,
    {
      assets = [],
      outputMap = {},
      root = "file:///dist/",
      importMap,
    }: Partial<CreateChunkContext> = {},
  ) {
    const time = performance.now();

    const { input, type, format } = asset;
    const context = {
      assets,
      importMap,
      outputMap,
      root,
      bundler: this,
    };

    for (const plugin of this.plugins) {
      if (
        plugin.createChunk instanceof Function &&
        await plugin.test(input, type, format)
      ) {
        const chunk = await plugin.createChunk(asset, chunkAssets, context);
        this.logger.debug(colors.yellow("Output"), chunk.output);

        for (const dependencyItem of chunk.dependencyItems) {
          this.logger.debug(
            colors.yellow("Inline"),
            dependencyItem.input,
            colors.dim(dependencyItem.type),
            colors.dim(dependencyItem.format),
          );
        }

        this.logger.info(
          colors.green("Create Chunk"),
          chunk.item.input,
          colors.dim(plugin.constructor.name),
          colors.dim(chunk.item.type),
          colors.dim(chunk.item.format),
          colors.dim(colors.italic(`(${timestamp(time)})`)),
        );
        return chunk;
      }
    }
    throw new Error(`no plugin for 'createChunk' found: ${input} ${type}`);
  }

  async createChunks(
    inputs: string[],
    assets: Asset[],
    {
      importMap,
      outputMap = {},
      root = "file:///dist/",
      chunks: cachedChunks = [],
    }: Partial<
      CreateChunksContext
    > = {},
  ): Promise<Chunk[]> {
    const context = {
      importMap,
      outputMap,
      root,
      assets,
      bundler: this,
    };

    const chunkItems: Item[] = inputs.map((input) => ({
      input: new URL(input, "file://").href,
      type: DependencyType.ImportExport,
      format: getDependencyFormat(input) || DependencyFormat.Script,
    }));

    const chunkAssets: Set<Asset> = new Set();

    const checkTime = performance.now();

    const checkedAssets: Set<Asset> = new Set();
    for (const chunkItem of chunkItems) {
      const time = performance.now();
      const { input, type, format } = chunkItem;

      const asset = getAsset(assets, input, type, format);

      const splitItems = await this.splitAssetDependencies(asset, context);
      chunkItems.push(...splitItems);
      chunkAssets.add(asset);

      const items = [chunkItem];
      const checkedDependencyAssets: Set<Asset> = new Set();
      for (const item of items) {
        const { input, type, format } = item;
        const asset = getAsset(assets, input, type, format);
        if (asset.dependencies.length) {
          for (const dependency of asset.dependencies) {
            const depdendencyAsset = getAsset(
              assets,
              dependency.input,
              dependency.type,
              dependency.format,
            );

            if (checkedDependencyAssets.has(depdendencyAsset)) continue;
            checkedDependencyAssets.add(depdendencyAsset);

            if (checkedAssets.has(depdendencyAsset)) {
              this.logger.debug(
                colors.yellow("Split"),
                depdendencyAsset.input,
                colors.dim(depdendencyAsset.type),
                colors.dim(depdendencyAsset.format),
              );
              chunkAssets.add(depdendencyAsset);
            } else {
              this.logger.debug(
                colors.yellow("Check"),
                depdendencyAsset.input,
                colors.dim(depdendencyAsset.type),
                colors.dim(depdendencyAsset.format),
              );
              if (
                !chunkItems.some((chunkItem) =>
                  chunkItem.input === input &&
                  chunkItem.type === type &&
                  chunkItem.format === format
                )
              ) {
                items.push({
                  input: dependency.input,
                  type: dependency.type,
                  format: dependency.format,
                });
              }
            }
            checkedAssets.add(depdendencyAsset);
          }
          checkedAssets.add(asset);

          this.logger.info(
            colors.green("Check Dependencies"),
            input,
            colors.dim(type),
            colors.dim(format),
            colors.dim(colors.italic(`(${timestamp(time)})`)),
          );
        }
      }
    }

    const checkedAssetLength = checkedAssets.size;

    this.logger.info(
      colors.brightBlue("Check"),
      "Dependencies",
      colors.dim(
        `${checkedAssetLength} file${checkedAssetLength === 1 ? "" : "s"}`,
      ),
      colors.dim(colors.italic(`(${timestamp(checkTime)})`)),
    );

    const time = performance.now();

    const chunks: Chunk[] = [...cachedChunks];
    const newChunks: Chunk[] = [];

    for (const asset of chunkAssets) {
      let chunk = chunks.find((chunk) =>
        chunk.item.input === asset.input &&
        chunk.item.type === asset.type &&
        chunk.item.format === asset.format
      );
      if (chunk) {
        this.logger.info(
          colors.green("Check Chunk"),
          asset.input,
          colors.dim(asset.type),
          colors.dim(asset.format),
        );
      } else {
        chunk = await this.createChunk(asset, chunkAssets, context);
        chunks.push(chunk);
        newChunks.push(chunk);
      }
    }

    const chunkLength = newChunks.length;

    this.logger.info(
      colors.brightBlue("Create"),
      "Chunks",
      colors.dim(`${chunkLength} file${chunkLength === 1 ? "" : "s"}`),
      colors.dim(colors.italic(`(${timestamp(time)})`)),
    );

    return newChunks;
  }

  async createBundle(
    chunk: Chunk,
    {
      root = "file:///dist/",
      importMap,
      optimize,
      chunks = [],
    }: Partial<
      CreateBundleContext
    > = {},
  ) {
    const context = {
      root,
      importMap,
      optimize,
      chunks,
      bundler: this,
    };
    const time = performance.now();
    const { input, type, format } = chunk.item;

    for (const plugin of this.plugins) {
      if (
        plugin.createBundle instanceof Function &&
        await plugin.test(input, type, format)
      ) {
        const bundle = await plugin.createBundle(chunk, context);

        if (context.optimize) {
          bundle.source = await this.optimizeSource(chunk, bundle.source);
        }
        this.logger.info(
          colors.green("Create Bundle"),
          input,
          colors.dim(plugin.constructor.name),
          colors.dim(type),
          colors.dim(format),
          colors.dim(colors.italic(`(${timestamp(time)})`)),
        );
        return bundle;
      }
    }
    throw new Error(
      `no plugin for 'createBundle' found: ${input} ${type}`,
    );
  }

  async optimizeSource(chunk: Chunk, source: Source) {
    const { input, type, format } = chunk.item;
    for (const plugin of this.plugins) {
      if (
        plugin.optimizeSource instanceof Function &&
        await plugin.test(input, type, format)
      ) {
        const time = performance.now();
        source = await plugin.optimizeSource(source);
        this.logger.debug(
          colors.yellow("Optimize"),
          colors.dim(plugin.constructor.name),
          colors.dim(type),
          colors.dim(format),
          colors.dim(colors.italic(`(${timestamp(time)})`)),
        );
      }
    }
    return source;
  }

  async createBundles(
    chunks: Chunk[],
    { root = "file:///dist/", importMap, optimize }: Partial<
      CreateBundlesContext
    > = {},
  ) {
    const time = performance.now();
    const bundles = [];
    const context = {
      root,
      importMap,
      chunks,
      optimize,
      bundler: this,
    };
    for (const chunk of chunks) {
      const bundle = await this.createBundle(chunk, context);
      bundles.push(bundle);
    }

    const length = bundles.length;
    this.logger.info(
      colors.brightBlue("Create"),
      "Bundles",
      colors.dim(`${length} file${length === 1 ? "" : "s"}`),
      colors.dim(colors.italic(`(${timestamp(time)})`)),
    );
    return bundles;
  }

  async bundle(
    inputs: string[],
    options: Partial<
      CreateAssetsContext & CreateChunksContext & CreateBundlesContext
    > = {},
  ) {
    const assets = await this.createAssets(inputs, options);

    let chunks: Chunk[] = [];
    if (assets.length) {
      chunks = await this.createChunks(inputs, [
        ...options.assets || [],
        ...assets,
      ], options);
    }

    let bundles: Bundle[] = [];
    if (chunks.length) {
      bundles = await this.createBundles(chunks, options);
    }

    return { assets, chunks, bundles };
  }
}
