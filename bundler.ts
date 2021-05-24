import {
  readTextFile,
  removeRelativePrefix,
  size,
  timestamp,
} from "./_util.ts";
import { colors, path, Sha256 } from "./deps.ts";
import { Asset, getAsset, Graph } from "./graph.ts";
import {
  Bundles,
  Cache,
  Chunk,
  ChunkList,
  Chunks,
  Context,
  DependencyType,
  Format,
  getFormat,
  Item,
  OutputMap,
  Plugin,
  Source,
  Sources,
} from "./plugins/plugin.ts";
import { resolve as resolveCache } from "./cache/cache.ts";
import { Logger, logLevels } from "./logger.ts";

interface Options {
  importMap?: Deno.ImportMap;
  sources?: Sources;
  reload?: boolean | string[];
}

export interface CreateGraphOptions extends Options {
  graph?: Graph;
  outDirPath?: string;
  outputMap?: OutputMap;
}

export interface CreateChunkOptions extends Options {
  chunks?: Chunks;
}

export interface CreateBundleOptions extends Options {
  bundles?: Bundles;
  optimize?: boolean;
  cache?: Cache;
}

export interface BundleOptions extends Options {
  outDirPath?: string;
  outputMap?: OutputMap;
  graph?: Graph;
  chunks?: Chunks;
  bundles?: Bundles;
  cache?: Cache;

  optimize?: boolean;
}

export class Bundler {
  private plugins: Plugin[];
  readonly logger: Logger;
  constructor(
    plugins: Plugin[],
    { logger = new Logger({ logLevel: logLevels.info }) }: {
      logger?: Logger;
    } = {},
  ) {
    this.plugins = plugins;
    this.logger = logger;
  }
  async readSource(item: Item, context: Context): Promise<Source> {
    const { logger } = context;
    const input = item.history[0];

    const source = context.sources[input];
    if (source !== undefined) {
      return source;
    }

    for (const plugin of this.plugins) {
      if (plugin.readSource && await plugin.test(item, context)) {
        try {
          const time = performance.now();
          const source = await plugin.readSource(input, context);
          context.sources[input] = source;

          logger.debug(
            "Read Source",
            input,
            colors.dim(plugin.constructor.name),
            colors.dim(colors.italic(`(${timestamp(time)})`)),
          );
          return source;
        } catch (error) {
          if (error instanceof Deno.errors.NotFound) {
            throw new Error(`file was not found: ${input}`);
          }
          throw error;
        }
      }
    }
    throw new Error(`No readSource plugin found: '${input}'`);
  }
  async transformSource(
    bundleInput: string,
    item: Item,
    context: Context,
  ) {
    const { logger } = context;
    const input = item.history[0];

    let source = await this.readSource(item, context);

    for (const plugin of this.plugins) {
      if (plugin.transformSource && await plugin.test(item, context)) {
        const time = performance.now();
        const newSource = await plugin.transformSource(
          bundleInput,
          item,
          context,
        );
        if (newSource !== undefined) {
          source = newSource;
          logger.debug(
            "Transform Source",
            input,
            colors.dim(plugin.constructor.name),
            colors.dim(colors.italic(`(${timestamp(time)})`)),
          );
        }
      }
    }
    return source;
  }
  async createAsset(
    item: Item,
    context: Context,
  ): Promise<Asset> {
    const { logger } = context;
    const time = performance.now();
    const input = item.history[0];

    for (const plugin of this.plugins) {
      if (plugin.createAsset && await plugin.test(item, context)) {
        const asset = await plugin.createAsset(item, context);
        if (asset !== undefined) {
          logger.debug(
            "Create Asset",
            input,
            colors.dim(plugin.constructor.name),
            colors.dim(colors.italic(`(${timestamp(time)})`)),
          );
          [
            ...Object.entries(asset.dependencies.imports),
            ...Object.entries(asset.dependencies.exports),
          ].forEach((
            [dependency, { format, type }],
          ) =>
            logger.debug(
              colors.dim(`→`),
              colors.dim(type),
              colors.dim(dependency),
              colors.dim(
                `{ ${Format[format]} }`,
              ),
            )
          );
          return asset;
        }
      }
    }
    throw new Error(`No createAsset plugin found: '${input}'`);
  }
  async createGraph(inputs: string[], options: CreateGraphOptions = {}) {
    const time = performance.now();
    const outDirPath = "dist";
    const context: Context = {
      importMap: { imports: {}, scopes: {} },
      outputMap: {},
      reload: false,
      optimize: false,
      quiet: false,
      outDirPath,
      depsDirPath: path.join(outDirPath, "deps"),
      cacheDirPath: path.join(outDirPath, ".cache"),

      sources: {},
      cache: {},
      graph: {},

      chunks: [],
      bundles: {},

      logger: new Logger({
        logLevel: this.logger.logLevel,
        quiet: this.logger.quiet,
      }),

      ...options,

      bundler: this,
    };

    const graph: Graph = {};

    const itemList: Item[] = inputs.map((
      input,
    ) => ({
      history: [input],
      type: DependencyType.Import, /* entry type */
      format: getFormat(input) || Format.Unknown,
    }));

    const checkedInputs: Record<string, DependencyType[]> = {};

    for (const item of itemList) {
      const { history, type } = item;
      const input = removeRelativePrefix(history[0]);

      checkedInputs[input] ||= [];
      if (checkedInputs[input].includes(type)) continue;
      checkedInputs[input].push(type);

      let asset = context.graph[input]?.[type];

      const needsReload = context.reload === true ||
        Array.isArray(context.reload) && context.reload.includes(input);

      let needsUpdate = needsReload;

      if (!asset) {
        needsUpdate = true;
      } else if (!needsReload) {
        try {
          if (
            Deno.statSync(asset.input).mtime! >
              Deno.statSync(asset.output).mtime!
          ) {
            needsUpdate = true;
          }
        } catch (error) {
          if (error instanceof Deno.errors.NotFound) {
            needsUpdate = true;
          } else {
            throw error;
          }
        }
      }

      if (needsUpdate) {
        asset = await this.createAsset(item, context);
      }

      if (!asset) {
        throw new Error(`asset not found: ${input} ${item.type}`);
      }

      const entry = graph[input] ||= {};
      entry[type] = asset;

      for (const dependencies of Object.values(asset.dependencies)) {
        for (
          const [dependency, { type, format }] of Object.entries(dependencies)
        ) {
          const index = history.indexOf(dependency);
          if (index > 0) {
            const deps = [...history.slice(0, index + 1).reverse(), dependency];
            console.error(
              colors.red(`Circular Dependency`),
            );
            console.error(colors.dim(deps.join(` → `)));
            throw new Error(`Circular Dependency`);
          }
          if (input !== dependency) {
            itemList.push({
              history: [dependency, ...history],
              type,
              format,
            });
          }
        }
      }
    }

    const length = Object.keys(checkedInputs).length;

    context.logger.info(
      colors.green("Create"),
      "Graph",
      colors.dim(
        `${length} file${length === 1 ? "" : "s"}`,
      ),
      colors.dim(colors.italic(`(${timestamp(time)})`)),
    );

    Object.entries(graph).forEach(([input, types]) => {
      context.logger.debug(
        colors.dim(`➞`),
        colors.dim(input),
      );
      Object.values(types).forEach((asset) => {
        const dependencies = [
          ...Object.entries(asset!.dependencies.imports),
          ...Object.entries(asset!.dependencies.exports),
        ];

        dependencies.forEach(([dependency, { type, format }]) => {
          context.logger.debug(
            colors.dim(`  `),
            colors.dim(type),
            colors.dim(dependency),
            colors.dim(`{ ${Format[format]} }`),
          );
        });
      });
    });

    return graph;
  }
  async createChunk(
    item: Item,
    context: Context,
    chunkList: ChunkList,
  ) {
    const { logger } = context;
    const time = performance.now();
    for (const plugin of this.plugins) {
      if (plugin.createChunk && await plugin.test(item, context)) {
        const chunk = await plugin.createChunk(
          item,
          context,
          chunkList,
        );
        if (chunk !== undefined) {
          logger.debug(
            "Create Chunk",
            chunk.item.history[0],
            colors.dim(plugin.constructor.name),
            colors.dim(colors.italic(`(${timestamp(time)})`)),
          );
          const items = [item, ...chunk.dependencyItems];
          items.forEach((item) => {
            const input = item.history[0];
            logger.debug(
              colors.dim(`➞`),
              colors.dim(item.type),
              colors.dim(input),
              colors.dim(
                `{ ${Format[item.format]} }`,
              ),
            );
          });
          return chunk;
        }
      }
    }

    const input = item.history[0];
    throw new Error(`No createChunk plugin found: '${input}'`);
  }
  async createChunks(
    inputs: string[],
    graph: Graph,
    options: CreateChunkOptions = {},
  ) {
    const time = performance.now();
    const context: Context = {
      importMap: { imports: {} },
      outputMap: {},
      reload: false,
      optimize: false,
      quiet: false,
      outDirPath: "dist",
      depsDirPath: "dist/deps",
      cacheDirPath: "dist/.cache",

      sources: {},
      cache: {},

      chunks: [],

      bundles: {},

      logger: new Logger({
        logLevel: this.logger.logLevel,
        quiet: this.logger.quiet,
      }),

      ...options,

      graph,

      bundler: this,
    };

    const chunkList: Item[] = inputs.map((input) => {
      const type = DependencyType.Import;
      const asset = getAsset(graph, input, type);
      return {
        asset,
        history: [input],
        type,
        format: getFormat(input) || Format.Unknown,
      };
    });

    const chunks = context.chunks;
    const checkedChunks: Partial<
      Record<DependencyType, Record<string, Chunk>>
    > = {};

    for (const item of chunkList) {
      const { history, type } = item;
      const input = history[0];
      if (checkedChunks[type]?.[input]) continue;
      const chunk = await this.createChunk(item, context, chunkList);
      checkedChunks[type] ||= {};
      checkedChunks[type]![input] = chunk;
      chunks.push(chunk);
      for (const plugin of this.plugins) {
        if (plugin.splitChunks && await plugin.test(item, context)) {
          const sharedItems = await plugin.splitChunks(item, context);
          chunk.dependencyItems.push(...sharedItems);
        }
      }
    }

    const length = chunks.length;
    context.logger.info(
      colors.green("Create"),
      "Chunks",
      colors.dim(`${length} file${length === 1 ? "" : "s"}`),
      colors.dim(colors.italic(`(${timestamp(time)})`)),
    );
    return chunks;
  }

  async createBundle(
    chunk: Chunk,
    context: Context,
  ) {
    const { logger } = context;
    const item = chunk.item;
    const input = item.history[0];

    const time = performance.now();
    for (const plugin of this.plugins) {
      if (plugin.createBundle && await plugin.test(item, context)) {
        const bundle = await plugin.createBundle(chunk, context) as string;
        const asset = getAsset(context.graph, input, item.type);
        if (bundle !== undefined) {
          const length = bundle.length;
          logger.info(
            colors.green("Create"),
            "Bundle",
            input,
            colors.dim(size(length)),
            colors.dim(colors.italic(`(${timestamp(time)})`)),
          );
          logger.debug(
            colors.dim(`➞`),
            colors.dim(asset.output),
          );

          return bundle;
        } else {
          // if bundle is up-to-date
          logger.info(
            colors.green("Check"),
            "Bundle",
            input,
            colors.dim(colors.italic(`(${timestamp(time)})`)),
          );
          logger.debug(
            colors.dim(`➞`),
            colors.dim(asset.output),
          );
          // exit
          return;
        }
      }
    }
    throw new Error(`No createBundle plugin found: '${input}'`);
  }
  async optimizeBundle(chunk: Chunk, context: Context) {
    const { logger } = context;
    const item = chunk.item;
    const { type, history } = item;
    const input = history[0];
    const asset = getAsset(context.graph, input, type);
    const { output } = asset;
    let bundle = context.bundles[output];
    for (const plugin of this.plugins) {
      if (plugin.optimizeBundle && await plugin.test(item, context)) {
        const time = performance.now();
        bundle = await plugin.optimizeBundle(output, context);
        logger.debug(
          "Optimize Bundle",
          input,
          colors.dim(`➞`),
          colors.dim((getAsset(context.graph, input, type).output)),
          colors.dim(plugin.constructor.name),
          colors.dim(colors.italic(`(${timestamp(time)})`)),
        );
      }
    }
    return bundle;
  }

  async createBundles(
    chunks: Chunks,
    graph: Graph,
    options: CreateBundleOptions = {},
  ) {
    const context: Context = {
      importMap: { imports: {} },
      outputMap: {},
      reload: false,
      quiet: false,
      optimize: false,
      outDirPath: "dist",
      depsDirPath: "dist/deps",
      cacheDirPath: "dist/.cache",
      bundles: {},

      sources: {},
      cache: {},

      logger: new Logger({
        logLevel: this.logger.logLevel,
        quiet: this.logger.quiet,
      }),

      ...options,

      graph,
      chunks,
      bundler: this,
    };
    const bundles = context.bundles;
    for (const chunk of context.chunks) {
      const bundle = await this.createBundle(chunk, context);
      if (bundle !== undefined) {
        const item = chunk.item;
        const chunkAsset = getAsset(graph, item.history[0], item.type);
        const output = chunkAsset.output;
        bundles[output] = bundle;
        if (context.optimize) {
          bundles[output] = await this.optimizeBundle(chunk, context);
        }
      }
    }
    return bundles;
  }

  async bundle(inputs: string[], options: BundleOptions = {}) {
    const time = performance.now();
    const cache: Cache = {};
    options = {
      sources: {}, // will be shared between createGraph, createChunks and createBundles
      cache: {}, // will be shared between createGraph, createChunks and createBundle

      ...options,
    };

    inputs = [...new Set(inputs)];

    inputs.forEach((input) => {
      this.logger.info(colors.brightBlue("Entry"), input);
    });

    const graph = await this.createGraph(
      inputs,
      { ...options },
    );
    const chunks = await this.createChunks(
      inputs,
      graph,
      { ...options },
    );
    const bundles = await this.createBundles(
      chunks,
      graph,
      { ...options, cache },
    );

    const length = Object.keys(bundles).length;
    this.logger.info(
      colors.brightBlue("Bundle"),
      colors.dim(
        length ? `${length} file${length === 1 ? "" : "s"}` : `up-to-date`,
      ),
      colors.dim(colors.italic(`(${timestamp(time)})`)),
    );

    return { cache, graph, chunks, bundles };
  }

  private createCacheFilePath(
    bundleInput: string,
    input: string,
    cacheDirPath: string,
  ) {
    const bundleCacheDirPath = new Sha256().update(bundleInput).hex();
    const filePath = resolveCache(input);
    const cacheFilePath = new Sha256().update(filePath).hex();
    return path.join(
      cacheDirPath,
      bundleCacheDirPath,
      cacheFilePath,
    );
  }
  /**
   * returns true if an entry exists in `context.cache` or cacheFile `mtime` is bigger than sourceFile `mtime`
   */
  hasCache(bundleInput: string, input: string, context: Context) {
    const { cacheDirPath, cache } = context;
    const filePath = resolveCache(input);

    const cacheFilePath = this.createCacheFilePath(
      bundleInput,
      input,
      cacheDirPath,
    );

    try {
      return cache[cacheFilePath] !== undefined ||
        Deno.statSync(cacheFilePath).mtime! > Deno.statSync(filePath).mtime!;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return false;
      }
      throw error;
    }
  }
  setCache(
    bundleInput: string,
    input: string,
    source: string,
    context: Context,
  ) {
    const { logger } = context;
    const { cacheDirPath, cache } = context;
    const cacheFilePath = this.createCacheFilePath(
      bundleInput,
      input,
      cacheDirPath,
    );
    logger.debug(
      "Cache",
      input,
    );
    logger.debug(colors.dim(`➞`), colors.dim(cacheFilePath));

    cache[cacheFilePath] = source;
  }
  async getCache(bundleInput: string, input: string, context: Context) {
    const { logger } = context;
    const time = performance.now();
    const { cacheDirPath, cache } = context;
    const cacheFilePath = this.createCacheFilePath(
      bundleInput,
      input,
      cacheDirPath,
    );

    if (cache[cacheFilePath]) return cache[cacheFilePath];
    const source = await readTextFile(cacheFilePath);
    logger.debug(
      "Read Cache",
      input,
      colors.dim(cacheFilePath),
      colors.dim(colors.italic(`(${timestamp(time)})`)),
    );
    return source;
  }
}
