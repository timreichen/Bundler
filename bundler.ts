import { size, timestamp } from "./_util.ts";
import { colors, ImportMap, path, Sha256 } from "./deps.ts";
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
  Plugin,
  Source,
  Sources,
} from "./plugins/plugin.ts";
import { resolve as resolveCache } from "./cache.ts";
import { Logger, LogLevel, logLevels } from "./logger.ts";

type Inputs = string[];

interface Options {
  importMap?: ImportMap;
  sources?: Sources;
  reload?: boolean | string[];
}

export interface CreateGraphOptions extends Options {
  graph?: Graph;
  outDirPath?: string;
  outputMap?: Record<string, string>;
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
  outputMap?: Record<string, string>;
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
    { logLevel = logLevels.info, quiet = false }: {
      logLevel?: LogLevel;
      quiet?: boolean;
    } = {},
  ) {
    this.plugins = plugins;
    this.logger = new Logger({ logLevel, quiet });
  }
  async readSource(item: Item, context: Context): Promise<Source> {
    const input = item.history[0];
    const source = context.sources[input];
    if (source !== undefined) return source;
    for (const plugin of this.plugins) {
      if (plugin.readSource && await plugin.test(item, context)) {
        const time = performance.now();
        const source = await plugin.readSource(input, context);
        context.sources[input] = source;
        this.logger.debug(
          colors.cyan("readSource"),
          input,
          colors.dim(plugin.constructor.name),
          colors.dim(timestamp(time)),
        );
        return source;
      }
    }
    throw new Error(`No readSource plugin found: '${input}'`);
  }
  async transformSource(
    bundleInput: string,
    item: Item,
    context: Context,
  ) {
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
          this.logger.debug(
            colors.cyan("transformSource"),
            input,
            colors.dim(plugin.constructor.name),
            colors.dim(timestamp(time)),
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
    const time = performance.now();
    const input = item.history[0];
    for (const plugin of this.plugins) {
      if (plugin.createAsset && await plugin.test(item, context)) {
        const asset = await plugin.createAsset(item, context);
        if (asset !== undefined) {
          this.logger.debug(
            colors.cyan("createAsset"),
            input,
            colors.dim(plugin.constructor.name),
            colors.dim(timestamp(time)),
          );
          return asset;
        }
      }
    }
    throw new Error(`No createAsset plugin found: '${input}'`);
  }
  async createGraph(inputs: Inputs, options: CreateGraphOptions = {}) {
    const time = performance.now();
    const outDirPath = "dist";
    const context: Context = {
      importMap: { imports: {} },
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

      ...options,

      chunks: [],
      bundles: {},

      bundler: this,
    };
    // if reload is true, have graph be an empty onject
    const graph: Graph = {};

    const assetList: Item[] = inputs.map((
      input,
    ) => ({
      history: [input],
      type: DependencyType.Import, /* entry type */
      format: getFormat(input) ||
        Format.Unknown, /* format based on extension */
    }));

    for (const item of assetList) {
      const { history, type } = item;
      const input = history[0];
      const entry = graph[input] = graph[input] || {};

      let asset = context.graph[input]?.[type];

      const needsReload = context.reload === true ||
        Array.isArray(context.reload) && context.reload.includes(input);

      let needsUpdate = needsReload || !asset;

      if (!context.reload && asset) {
        try {
          if (
            Deno.statSync(asset.filePath).mtime! <
              Deno.statSync(asset.output).mtime!
          ) {
            needsUpdate = false;
          }
        } catch {}
      }

      if (needsUpdate) {
        asset = await this.createAsset(item, context);
      }
      entry[type] = asset;

      if (!asset) {
        throw new Error(`asset not found: ${input} ${item.type}`);
      }

      for (const dependencies of Object.values(asset.dependencies)) {
        for (
          const [dependency, { type, format }] of Object.entries(dependencies)
        ) {
          if (input !== dependency) {
            assetList.push({
              history: [dependency, ...history],
              type,
              format,
            });
          }
        }
      }
    }

    this.logger.info(
      colors.green("Create"),
      "Graph",
      colors.dim(
        `${assetList.length} file${assetList.length === 1 ? "" : "s"}`,
      ),
      colors.dim(timestamp(time)),
    );

    return graph;
  }
  async createChunk(
    item: Item,
    context: Context,
    chunkList: ChunkList,
  ) {
    const time = performance.now();
    for (const plugin of this.plugins) {
      if (plugin.createChunk && await plugin.test(item, context)) {
        const chunk = await plugin.createChunk(
          item,
          context,
          chunkList,
        );
        if (chunk !== undefined) {
          this.logger.debug(
            colors.cyan("createChunk"),
            chunk.history[0],
            colors.dim(plugin.constructor.name),
            colors.dim(timestamp(time)),
            ...chunk.dependencies.map((dependency) =>
              colors.dim(
                [
                  `\n`,
                  `➞`,
                  dependency.history[0],
                  `{ ${Format[dependency.format]}, ${dependency.type} }`,
                ].join(` `),
              )
            ),
          );
          return chunk;
        }
      }
    }

    const input = item.history[0];
    throw new Error(`No createChunk plugin found: '${input}'`);
  }
  async createChunks(
    inputs: Inputs,
    graph: Graph,
    options: CreateChunkOptions = {},
  ) {
    const time = performance.now();
    const chunkList: Item[] = inputs.map((input) => ({
      history: [input],
      type: DependencyType.Import,
      format: getFormat(input) || Format.Unknown,
    }));
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

      ...options,

      graph,
      bundles: {},
      bundler: this,
    };
    const chunks = context.chunks;
    const checkedChunks: any = {};
    let counter = 0;

    for (const item of chunkList) {
      const { history, type } = item;
      const input = history[0];
      if (checkedChunks[type]?.[input]) continue;
      const chunk = await this.createChunk(item, context, chunkList);
      checkedChunks[type] = checkedChunks[type] || {};
      checkedChunks[type][input] = chunk;
      chunks.push(chunk);
      counter += 1;
    }

    this.logger.info(
      colors.green("Create"),
      "Chunks",
      colors.dim(`${counter} file${counter === 1 ? "" : "s"}`),
      colors.dim(timestamp(time)),
    );
    return chunks;
  }
  async createBundle(
    chunk: Chunk,
    context: Context,
  ) {
    const time = performance.now();
    for (const plugin of this.plugins) {
      if (plugin.createBundle && await plugin.test(chunk, context)) {
        const bundle = await plugin.createBundle(chunk, context);
        const input = chunk.history[0];
        if (bundle !== undefined) {
          this.logger.debug(
            colors.cyan("createBundle"),
            input,
            colors.dim(plugin.constructor.name),
            colors.dim(timestamp(time)),
            `\n`,
            colors.dim(`➞`),
            colors.dim((getAsset(context.graph, chunk.type, input).output)),
            colors.dim(`{ ${Format[chunk.format]}, ${chunk.type} }`),
          );
          const length = bundle.length;
          this.logger.info(
            colors.green("Create"),
            "Bundle",
            input,
            colors.dim(size(length)),
            colors.dim(timestamp(time)),
            `\n`,
            colors.dim(`➞`),
            colors.dim((getAsset(context.graph, chunk.type, input).output)),
          );
          return bundle;
        } else {
          // if bundle is up-to-date
          this.logger.info(
            colors.green("Check"),
            "Bundle",
            input,
            colors.dim(timestamp(time)),
            `\n`,
            colors.dim(`➞`),
            colors.dim((getAsset(context.graph, chunk.type, input).output)),
          );
          // exit
          return;
        }
      }
    }
    throw new Error(`No createBundle plugin found: '${chunk.history[0]}'`);
  }
  async optimizeBundle(chunk: Chunk, context: Context) {
    const time = performance.now();
    const output = getAsset(context.graph, chunk.type, chunk.history[0]).output;
    let bundle = context.bundles[output];
    for (const plugin of this.plugins) {
      if (plugin.optimizeBundle && await plugin.test(chunk, context)) {
        const input = chunk.history[0];
        const output = getAsset(context.graph, chunk.type, input).output;
        bundle = await plugin.optimizeBundle(output, context);
        this.logger.debug(
          colors.cyan("optimizeBundle"),
          input,
          colors.dim(`➞`),
          colors.dim((getAsset(context.graph, chunk.type, input).output)),
          colors.dim(plugin.constructor.name),
          colors.dim(timestamp(time)),
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

      ...options,

      graph,
      chunks,
      bundler: this,
    };
    const bundles = context.bundles;
    for (const chunk of context.chunks) {
      let bundle = await this.createBundle(chunk, context);
      if (bundle !== undefined) {
        const input = chunk.history[0];
        const chunkAsset = getAsset(graph, chunk.type, input);
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
    const cache: Cache = {};
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
  async hasCache(bundleInput: string, input: string, context: Context) {
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
  async setCache(
    bundleInput: string,
    input: string,
    source: string,
    context: Context,
  ) {
    const { cacheDirPath, cache } = context;
    const cacheFilePath = this.createCacheFilePath(
      bundleInput,
      input,
      cacheDirPath,
    );
    this.logger.debug(
      colors.green("Create"),
      "Cache",
      input,
      `\n`,
      colors.dim(`➞`),
      colors.dim(cacheFilePath),
    );

    cache[cacheFilePath] = source;
  }
  async getCache(bundleInput: string, input: string, context: Context) {
    const { cacheDirPath, cache } = context;
    const cacheFilePath = this.createCacheFilePath(
      bundleInput,
      input,
      cacheDirPath,
    );

    if (cache[cacheFilePath]) return cache[cacheFilePath];
    this.logger.debug(
      colors.green("Read"),
      "Cache",
      input,
      colors.dim(cacheFilePath),
    );
    return await Deno.readTextFile(cacheFilePath);
  }
}
