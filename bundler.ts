import { colors, ImportMap } from "./deps.ts";
import { ConsoleLogger } from "./log/console_logger.ts";
import {
  CreateAssetOptions,
  CreateBundleOptions,
  CreateChunkOptions,
  Plugin,
} from "./plugins/plugin.ts";
import { SourceMap } from "./plugins/source_map.ts";
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

export class Bundler {
  plugins: Plugin[];
  sourceMap: SourceMap;
  logger: ConsoleLogger<unknown[]>;

  constructor(
    {
      plugins,
      sourceMap = new SourceMap(),
      logLevel = ConsoleLogger.logLevels.debug,
      quiet = false,
    }: {
      plugins: Plugin[];
      sourceMap?: SourceMap;
      logLevel?: number;
      quiet?: boolean;
    },
  ) {
    this.plugins = plugins;
    this.sourceMap = sourceMap;
    this.logger = new ConsoleLogger(logLevel);
    this.logger.quiet = quiet;
  }

  async createSource(
    input: string,
    type: DependencyType,
    format: DependencyFormat,
    bundler?: Bundler,
    { reload, importMap }: { reload?: boolean; importMap?: ImportMap } = {},
  ) {
    if (!this.sourceMap.has(input, type, format)) {
      for (const plugin of this.plugins) {
        if (
          plugin.createSource instanceof Function &&
          await plugin.test(input, type, format)
        ) {
          const source = await plugin.createSource(input, bundler, {
            importMap,
            reload,
          });
          this.sourceMap.set(input, type, format, source);
          return source;
        }
      }
      throw new Error(
        `no plugin for 'createSource' found: ${input} ${type} ${format}`,
      );
    }
    return this.sourceMap.get(input, type, format);
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
    { importMap, reload }: CreateAssetOptions = {},
  ) {
    const time = performance.now();

    const assets: Asset[] = [];

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
    bundler: Bundler,
    options: CreateChunkOptions,
  ) {
    const { input, type, format } = asset;
    for (const plugin of this.plugins) {
      if (
        plugin.splitDependencies instanceof Function &&
        await plugin.test(input, type, format)
      ) {
        const time = performance.now();
        const items = await plugin.splitDependencies(asset, bundler, options);
        this.logger.debug(
          colors.yellow(`Split Dependencies`),
          colors.dim(type),
          colors.dim(format),
          colors.dim(plugin.constructor.name),
          timestamp(time),
        );
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
    { root, outputMap, assets }: CreateChunkOptions = {},
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
    { root = ".", outputMap = {} }: CreateChunkOptions = {},
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
      const asset = getAsset(assets, input, type, format);
      if (checkedChunkItems.has(asset)) continue;
      checkedChunkItems.add(asset);

      const splitItems = await this.splitDependencies(asset, this, {
        root,
        outputMap,
      });

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

    const chunks: Chunk[] = [];
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
          colors.dim(type),
          colors.dim(format),
          colors.dim(plugin.constructor.name),
          timestamp(time),
        );
        bundle = await this.optimizeBundle(chunk, bundle);
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
          timestamp(time),
        );
      }
    }
    return bundle;
  }

  async createBundles(
    chunks: Chunk[],
    { root = ".", importMap, reload, optimize }: CreateBundleOptions = {},
  ) {
    const time = performance.now();
    const bundles = [];

    for (const chunk of chunks) {
      const { input, type, format } = chunk.item;
      const source = await this.createSource(input, type, format, this, {
        importMap,
        reload,
      });
      const bundle = await this.createBundle(chunk, source, this, {
        chunks,
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
    { assets = [], chunks = [], importMap, reload, root, outputMap, optimize }:
      & CreateAssetOptions
      & CreateChunkOptions
      & CreateBundleOptions = {},
  ) {
    const newAssets = await this.createAssets(inputs, { importMap, reload });

    const newChunks = await this.createChunks(
      inputs,
      [...assets, ...newAssets],
      { root, outputMap },
    );

    const newBundles = await this.createBundles(
      [...chunks, ...newChunks],
      { root, importMap, optimize, reload },
    );

    return {
      assets: newAssets,
      chunks: newChunks,
      bundles: newBundles,
    };
  }
}
