import { colors, path, Sha256 } from "./deps.ts";
import { Asset, getAsset, Graph } from "./graph.ts";
import { Logger, logLevels } from "./logger.ts";
import {
  Bundles,
  Cache,
  Chunk,
  Chunks,
  Context,
  DependencyType,
  History,
  Item,
  OutputMap,
  Plugin,
  Source,
  Sources,
} from "./plugins/plugin.ts";
import {
  readTextFile,
  removeRelativePrefix,
  size,
  timestamp,
} from "./_util.ts";
import { resolve as resolveCache } from "./cache/cache.ts";

function checkCircularDependency(history: History, dependency: string) {
  const index = history.indexOf(dependency);
  if (index > 0) {
    const deps = [...history.slice(0, index + 1).reverse(), dependency];
    console.error(
      colors.red(`Circular Dependency`),
      colors.dim(deps.join(` → `)),
    );
    throw new Error(`Circular Dependency`);
  }
}

interface Options {
  importMap?: Deno.ImportMap;
  sources?: Sources;
  reload?: boolean | string[];
  logger?: Logger;
}

export interface CreateGraphOptions extends Options {
  graph?: Graph;
  outDirPath?: string;
  outputMap?: OutputMap;
  includeTypeOnly?: boolean;
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
  plugins: Plugin[];
  logger: Logger;
  constructor(
    plugins: Plugin[],
  ) {
    this.plugins = plugins;
    this.logger = new Logger({ logLevel: logLevels.info });
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
            colors.cyan("Read Source"),
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
            colors.cyan("Transform Source"),
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
            colors.cyan("Create Asset"),
            input,
            colors.dim(plugin.constructor.name),
            colors.dim(colors.italic(`(${timestamp(time)})`)),
          );
          Object.keys(asset.dependencies).forEach(
            (dependency) => {
              logger.debug(
                colors.dim(`→`),
                colors.dim(dependency),
              );
            },
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
      includeTypeOnly: options.includeTypeOnly ?? true,

      bundler: this,
    };

    const graph: Graph = {};

    const itemList: Item[] = inputs.map((
      input,
    ) => ({
      history: [input],
      type: DependencyType.Import,
    }));

    const checkedInputs: Set<string> = new Set();

    for (const item of itemList) {
      const { history, type } = item;
      const input = removeRelativePrefix(history[0]);

      if (checkedInputs.has(input)) continue;
      checkedInputs.add(input);

      const needsReload = context.reload === true ||
        Array.isArray(context.reload) && context.reload.includes(input);

      let needsUpdate = needsReload;

      let asset = context.graph[input]?.find((asset) => asset.type === type);
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
        throw new Error(
          `asset not found: ${input} ${DependencyType[item.type]}`,
        );
      }

      const entry = graph[input] ||= [];
      entry.push(asset);
      Object.entries(asset.dependencies).forEach(
        ([dependency, types]) => {
          Object.keys(types).forEach((type) => {
            checkCircularDependency(history, dependency);
            itemList.push({
              history: [dependency, ...history],
              type: type as DependencyType,
            });
          });
        },
      );
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
      Object.values(types).forEach((asset) => {
        const { type, dependencies } = asset!;
        context.logger.debug(
          colors.dim(`➞`),
          colors.dim(input),
          colors.dim(`{ ${DependencyType[type]} }`),
        );
        Object.keys(dependencies).forEach((dependency) => {
          context.logger.debug(
            colors.dim(`   ➞`),
            colors.dim(dependency),
            colors.dim(`{ ${DependencyType[type]} }`),
          );
        });
      });
    });

    return graph;
  }
  async createChunk(
    item: Item,
    context: Context,
    chunkList: Item[],
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
          const { history } = item;
          const input = history[0];

          logger.debug(
            colors.cyan("Create Chunk"),
            input,
            colors.dim(plugin.constructor.name),
            colors.dim(colors.italic(`(${timestamp(time)})`)),
          );
          chunk.dependencyItems.forEach((dependencyItem) => {
            const { history, type } = dependencyItem;
            const input = history[0];
            logger.debug(
              colors.dim(`➞`),
              colors.dim(input),
              colors.dim(
                `{ ${DependencyType[type]} }`,
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
      return {
        history: [input],
        type: DependencyType.Import,
      };
    });

    const { chunks } = context;
    const checkedChunks: Partial<
      Record<DependencyType, Record<string, Chunk>>
    > = {};

    const allItems: Record<string, Set<DependencyType>> = {};

    for (const item of chunkList) {
      const { history, type } = item;
      const input = history[0];
      if (checkedChunks[type]?.[input]) continue;
      const chunk = await this.createChunk(item, context, chunkList);
      checkedChunks[type] ||= {};
      checkedChunks[type]![input] = chunk;
      chunks.push(chunk);
      await this.splitChunk(chunk, context, chunkList, allItems);
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
  private async splitChunk(
    chunk: Chunk,
    context: Context,
    chunkList: Item[],
    allItems: Record<string, Set<DependencyType>>,
  ) {
    const { logger, chunks } = context;

    logger.debug(colors.cyan("Split Chunk"), chunk.item.history[0]);

    const checked: Record<string, Set<DependencyType>> = {}; // cache outside loop for faster chunk splits

    const items = [...chunk.dependencyItems];

    function addItem(input: string, type: DependencyType) {
      (allItems[input] ||= new Set()).add(type);
    }
    function hasItem(input: string, type: DependencyType) {
      return allItems[input]?.has(type);
    }
    function addChunkItems({ item, dependencyItems }: Chunk) {
      addItem(item.history[0], item.type);
      dependencyItems.forEach((item) => addItem(item.history[0], item.type));
    }

    chunks.forEach((c) => {
      if (c === chunk) return;
      addChunkItems(c);
    });

    for (const item of items) {
      const { history, type } = item;
      const input = history[0];

      if (
        chunks.some(({ item }) =>
          item.history[0] === input && item.type === type
        )
      ) {
        continue;
      }

      const newChunk = await this.createChunk(item, {
        ...context,
        logger: new Logger({
          logLevel: logger.logLevel,
          quiet: true,
        }),
      }, chunkList);

      if (hasItem(input, type)) {
        logger.debug(colors.dim("→"), colors.yellow("Split"), input);
        chunks.push(newChunk);
        items.push(...newChunk.dependencyItems);
      } else {
        logger.debug(
          colors.dim("→"),
          colors.dim("Check"),
          colors.dim(input),
        );
        (checked[input] ||= new Set()).add(type);
        addChunkItems(newChunk);
      }
    }
  }

  async createBundle(
    chunk: Chunk,
    context: Context,
  ) {
    const { logger } = context;
    const item = chunk.item;
    const { history, type } = item;
    const input = history[0];

    const time = performance.now();
    for (const plugin of this.plugins) {
      if (plugin.createBundle && await plugin.test(item, context)) {
        const bundle = await plugin.createBundle(chunk, context) as string;
        const asset = getAsset(context.graph, input, type);
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
          // logger.debug(
          //   colors.dim(`➞`),
          //   colors.dim(asset.output),
          // );
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
          colors.dim((asset.output)),
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
        const { history, type } = item;
        const input = history[0];
        const chunkAsset = getAsset(graph, input, type);
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
      { ...options, includeTypeOnly: false },
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
    logger.trace(
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
    logger.trace(
      "Read Cache",
      input,
      colors.dim(cacheFilePath),
      colors.dim(colors.italic(`(${timestamp(time)})`)),
    );
    return source;
  }
}
