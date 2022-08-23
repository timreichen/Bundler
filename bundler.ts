import { colors, ImportMap } from "./deps.ts";
import { ConsoleLogger } from "./log/console_logger.ts";
import {
  CreateAssetOptions,
  CreateBundleOptions,
  CreateChunkOptions,
  Plugin,
} from "./plugins/plugin.ts";
import { CacheMap } from "./plugins/cache_map.ts";
import {
  Asset,
  Bundle,
  Chunk,
  DependencyFormat,
  DependencyType,
  Item,
  Source,
} from "./plugins/plugin.ts";
import { timestamp } from "./_util.ts";
import { getAsset, getDependencyFormat } from "./plugins/_util.ts";

export interface BundleOptions
  extends CreateAssetOptions, CreateChunkOptions, CreateBundleOptions {
}

export class Bundler {
  plugins: Plugin[];
  cacheMap: CacheMap<Source>;
  logger: ConsoleLogger<unknown[]>;

  constructor(
    {
      plugins,
      cacheMap = new CacheMap(),
      logLevel = ConsoleLogger.logLevels.debug,
      quiet = false,
    }: {
      plugins: Plugin[];
      cacheMap?: CacheMap<Source>;
      logLevel?: number;
      quiet?: boolean;
    },
  ) {
    this.plugins = plugins;
    this.cacheMap = cacheMap;
    this.logger = new ConsoleLogger(logLevel);
    this.logger.quiet = quiet;
  }

  async createSource(
    input: string,
    type: DependencyType,
    format: DependencyFormat,
    { importMap }: {
      reload?: boolean | string[];
      importMap?: ImportMap;
    } = {},
  ) {
    // const shouldReload = reload === true ||
    //   Array.isArray(reload) && reload.includes(input);
    if (
      !this.cacheMap.has(input, type, format)
    ) {
      for (const plugin of this.plugins) {
        if (
          plugin.createSource instanceof Function &&
          await plugin.test(input, type, format)
        ) {
          const source = await plugin.createSource(input, this, {
            importMap,
            // reload,
          });
          this.cacheMap.set(input, type, format, source);
          return source;
        }
      }
      throw new Error(
        `no plugin for 'createSource' found: ${input} ${type} ${format}`,
      );
    }
    return this.cacheMap.get(input, type, format);
  }

  async createAsset(
    input: string,
    type: DependencyType,
    _bundler?: Bundler,
    { importMap, reload }: CreateAssetOptions = {},
  ) {
    const format = getDependencyFormat(input) ?? DependencyFormat.Unknown;
    for (const plugin of this.plugins) {
      if (
        await plugin.test(input, type, format) &&
        plugin.createAsset instanceof Function
      ) {
        const time = performance.now();
        const asset = await plugin.createAsset(input, type, this, {
          importMap,
          reload,
        });
        this.logger.info(
          colors.green("Create Asset"),
          input,
          colors.dim(type),
          colors.dim(format),
          colors.dim(plugin.constructor.name),
          colors.dim(colors.italic(`(${timestamp(time)})`)),
        );
        return asset;
      }
    }
    throw new Error(
      `no plugin for 'createChunk' found: ${input} ${type} ${format}`,
    );
  }
  async createAssets(
    inputs: string[],
    { importMap, reload, assets = [] }: CreateAssetOptions = {},
  ) {
    const time = performance.now();

    assets = [...assets];

    const newAssets: Asset[] = [];

    const options: CreateAssetOptions = { importMap, reload };

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

      let asset;
      if (!reload) {
        asset = assets.find((asset) =>
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
        }
      }

      if (!asset) {
        asset = await this.createAsset(input, type, this, options);
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

  async splitDependencies(
    asset: Asset,
    { assets = [], root, chunks, outputMap }: CreateChunkOptions,
  ) {
    const { input, type, format } = asset;

    const splitAssets = [asset];
    const items: Item[] = [];

    for (const dependency of asset.dependencies) {
      const dependencyAsset = getAsset(
        assets,
        dependency.input,
        dependency.type,
        dependency.format,
      );
      splitAssets.push(dependencyAsset);
    }

    for (const plugin of this.plugins) {
      if (
        plugin.splitDependencies instanceof Function &&
        await plugin.test(input, type, format)
      ) {
        // const time = performance.now();
        const splitItems = await plugin.splitDependencies(
          asset,
          this,
          { assets, root, chunks, outputMap },
        );
        // this.logger.debug(
        //   colors.yellow(`Split Dependencies`),
        //   input,
        //   colors.dim(type),
        //   colors.dim(format),
        //   colors.dim(plugin.constructor.name),
        //   colors.dim(colors.italic(`(${timestamp(time)})`)),
        // );
        items.push(...splitItems);
        return items;
      }
    }
    throw new Error(
      `no plugin for 'splitDependencies' found: ${input} ${type} ${format}`,
    );
  }

  async createChunk(
    asset: Asset,
    chunkAssets: Set<Asset>,
    _bundler?: Bundler,
    { root, outputMap, assets }: CreateChunkOptions = { assets: [] },
  ) {
    const { input, type, format } = asset;

    for (const plugin of this.plugins) {
      if (
        await plugin.test(input, type, format) &&
        plugin.createChunk instanceof Function
      ) {
        const time = performance.now();
        const chunk = await plugin.createChunk(asset, chunkAssets, this, {
          root,
          outputMap,
          assets,
        });
        this.logger.info(
          colors.green("Create Chunk"),
          input,
          colors.dim(type),
          colors.dim(format),
          colors.dim(plugin.constructor.name),
          colors.dim(colors.italic(`(${timestamp(time)})`)),
        );
        return chunk;
      }
    }
    throw new Error(
      `no plugin for 'createChunk' found: ${input} ${type} ${format}`,
    );
  }
  async createChunks(
    inputs: string[],
    assets: Asset[],
    { root = ".", outputMap = {}, chunks = [] }: CreateChunkOptions = {},
  ): Promise<Chunk[]> {
    const chunkItems: Item[] = inputs.map((input) => ({
      input: new URL(input, "file://").href,
      type: DependencyType.ImportExport,
      format: getDependencyFormat(input) || DependencyFormat.Script,
    }));

    const chunkAssets: Set<Asset> = new Set();

    const checkTime = performance.now();

    const checkedAssets: Set<Asset> = new Set();

    const checkedChunkItems: Set<Asset> = new Set();
    for (const chunkItem of chunkItems) {
      const time = performance.now();
      const { input, type, format } = chunkItem;
      this.logger.debug(
        colors.yellow("Check Chunk"),
        input,
        colors.dim(type),
        colors.dim(format),
      );

      const asset = getAsset(assets, input, type, format);
      if (checkedChunkItems.has(asset)) continue;
      checkedChunkItems.add(asset);

      const splitItems = await this.splitDependencies(asset, {
        root,
        outputMap,
        assets,
      });

      chunkItems.push(...splitItems);
      chunkAssets.add(asset);

      const items = [chunkItem];
      const checkedDependencyAssets: Set<Asset> = new Set();
      for (const item of items) {
        const { input, type, format } = item;
        // this.logger.debug(
        //   colors.dim("→"),
        //   colors.yellow("Check Item"),
        //   input,
        //   colors.dim(type),
        //   colors.dim(format),
        // );

        const asset = getAsset(assets, input, type, format);
        if (asset.dependencies.length) {
          const dependencies = [...asset.dependencies];
          for (const dependency of dependencies) {
            const dependencyAsset = getAsset(
              assets,
              dependency.input,
              dependency.type,
              dependency.format,
            );

            if (
              checkedDependencyAssets.has(dependencyAsset) || chunkItems.some(
                (item) =>
                  item.input == dependencyAsset.input &&
                  item.type === dependencyAsset.type,
                item.format === dependencyAsset.format,
              )
            ) {
              continue;
            }
            checkedDependencyAssets.add(dependencyAsset);

            if (checkedAssets.has(dependencyAsset)) {
              this.logger.debug(
                colors.dim("→"),
                colors.yellow("Split Dependency"),
                dependencyAsset.input,
                colors.dim(dependencyAsset.type),
                colors.dim(dependencyAsset.format),
              );
              chunkAssets.add(dependencyAsset);
            } else {
              this.logger.debug(
                colors.dim("→"),
                colors.yellow("Check Dependency"),
                dependencyAsset.input,
                colors.dim(dependencyAsset.type),
                colors.dim(dependencyAsset.format),
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
              } else {
                chunkItems.push(
                  ...await this.splitDependencies(dependencyAsset, {
                    assets,
                    root,
                    chunks,
                    outputMap,
                  }),
                );
                dependencies.push(...dependencyAsset.dependencies);
              }
            }
            checkedAssets.add(dependencyAsset);
          }

          checkedAssets.add(asset);
        }
      }
      this.logger.debug(
        colors.green("Check Chunk"),
        input,
        colors.dim(type),
        colors.dim(format),
        colors.dim(colors.italic(`(${timestamp(time)})`)),
      );
    }

    const checkedAssetLength = checkedAssets.size;

    this.logger.info(
      colors.brightBlue("Check"),
      "Chunks",
      colors.dim(
        `${checkedAssetLength} file${checkedAssetLength === 1 ? "" : "s"}`,
      ),
      colors.dim(colors.italic(`(${timestamp(checkTime)})`)),
    );

    const time = performance.now();

    chunks = [...chunks];
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
        chunk = await this.createChunk(asset, chunkAssets, this, {
          assets,
          root,
          outputMap,
        });
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

  async injectDependencies(
    item: Item,
    ast: Source,
    dependencyItems: Item[],
    { chunks = [], root = ".", importMap }: CreateBundleOptions = {},
  ) {
    const { input, type, format } = item;
    for (const plugin of this.plugins) {
      if (
        await plugin.test(input, type, format) &&
        plugin.injectDependencies instanceof Function
      ) {
        const time = performance.now();
        ast = await plugin.injectDependencies(
          item,
          ast,
          dependencyItems,
          this,
          { chunks, root, importMap },
        );
        this.logger.info(
          colors.green("Inject Dependencies"),
          input,
          colors.dim(type),
          colors.dim(format),
          colors.dim(plugin.constructor.name),
          colors.dim(colors.italic(`(${timestamp(time)})`)),
        );
      }
    }
    return ast;
  }

  async createBundle(
    chunk: Chunk,
    source: Source,
    _bundler?: Bundler,
    options: CreateBundleOptions = {},
  ): Promise<Bundle> {
    const { input, type, format } = chunk.item;
    for (const plugin of this.plugins) {
      if (
        plugin.createBundle instanceof Function &&
        await plugin.test(input, type, format)
      ) {
        const time = performance.now();
        let bundle = await plugin.createBundle(chunk, source, this, options);
        this.logger.info(
          colors.green(`Create Bundle`),
          input,
          colors.dim(type),
          colors.dim(format),
          colors.dim(plugin.constructor.name),
          colors.dim(colors.italic(`(${timestamp(time)})`)),
        );
        if (options.optimize) bundle = await this.optimizeBundle(chunk, bundle);
        return bundle;
      }
    }
    throw new Error(
      `no plugin for 'createBundle' found: ${input} ${type} ${format}`,
    );
  }

  async optimizeBundle(chunk: Chunk, bundle: Bundle) {
    const { input, type, format } = chunk.item;
    for (const plugin of this.plugins) {
      if (
        plugin.optimizeBundle instanceof Function &&
        await plugin.test(input, type, format)
      ) {
        const time = performance.now();
        bundle.source = await plugin.optimizeBundle(bundle.source);
        this.logger.debug(
          colors.yellow(`Optimize Bundle`),
          colors.dim(type),
          colors.dim(format),
          colors.dim(plugin.constructor.name),
          colors.dim(colors.italic(`(${timestamp(time)})`)),
        );
      }
    }
    return bundle;
  }

  async createBundles(
    chunks: Chunk[],
    { root = ".", importMap, reload, optimize, chunks: cachedChunks = [] }:
      CreateBundleOptions = {},
  ) {
    const time = performance.now();
    const bundles = [];

    for (const chunk of chunks) {
      const { input, type, format } = chunk.item;

      const source = await this.createSource(input, type, format, {
        importMap,
        reload,
      });

      const bundle = await this.createBundle(chunk, source, this, {
        chunks: [...chunks, ...cachedChunks],
        root,
        importMap,
        optimize,
      });
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
    {
      assets = [],
      chunks = [],
      importMap,
      reload,
      root,
      outputMap,
      optimize,
    }: BundleOptions = {},
  ) {
    const newAssets = await this.createAssets(inputs, {
      importMap,
      reload,
      assets,
    });

    let newChunks: Chunk[] = [];
    let newBundles: Bundle[] = [];

    if (newAssets.length) {
      assets = [...assets, ...newAssets];
      newChunks = await this.createChunks(
        inputs,
        assets,
        { root, outputMap, chunks },
      );

      if (newChunks.length) {
        newBundles = await this.createBundles(
          newChunks,
          { root, importMap, optimize, reload, chunks },
        );
      }
    }

    return {
      assets: newAssets,
      chunks: newChunks,
      bundles: newBundles,
    };
  }
}
