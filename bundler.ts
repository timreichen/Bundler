import { colors, fs, ImportMap, path, Sha256 } from "./deps.ts";
import { resolve as resolveCache } from "./cache.ts";
import { Bundles, Chunks, Data, Plugin, Source } from "./plugins/plugin.ts";
import { Logger, LogLevel, logLevels } from "./logger.ts";
import { Graph } from "./graph.ts";
import { Chunk } from "./chunk.ts";

function createTimestamp(time: number) {
  return `${Math.ceil(performance.now() - time)}ms`;
}

const units = ["B", "KB", "MB", "GB", "TB"];
function humanizeSize(size: number) {
  const i = Math.floor(Math.log(size) / Math.log(1024));
  const unit = units[i];
  return `${Math.ceil(size / Math.pow(1024, i))}${unit}`;
}

type OutputMap = Record<string, string>;

export class Bundler {
  plugins: Plugin[];
  logger: Logger;
  sources: Record<string, Source>;
  outputMap: OutputMap;
  importMap: ImportMap;
  outDirPath: string;
  depsDirPath: string;
  cacheDirPath: string;
  cacheFilePath: string;
  constructor(
    plugins: Plugin[],
    {
      logLevel = logLevels.info,
      outputMap = {},
      importMap = { imports: {} },
      outDirPath = "dist",
      depsDirPath = "deps",
      cacheDirPath = ".cache",
      cacheFilePath = ".cache/cache.json",
    }: {
      logLevel?: LogLevel;
      importMap?: ImportMap;
      outputMap?: OutputMap;
      outDirPath?: string;
      depsDirPath?: string;
      cacheDirPath?: string;
      cacheFilePath?: string;
    } = {},
  ) {
    this.plugins = plugins;
    this.logger = new Logger({ logLevel });
    this.sources = {};
    this.outputMap = outputMap;
    this.importMap = importMap;
    this.outDirPath = outDirPath;
    this.depsDirPath = depsDirPath;
    this.cacheDirPath = cacheDirPath;
    this.cacheFilePath = cacheFilePath;
  }
  createOutput(filePath: string, extension: string) {
    return path.join(
      this.depsDirPath,
      `${new Sha256().update(filePath).hex()}${extension}`,
    );
  }
  async getSource(
    filePath: string,
    data: Data,
  ): Promise<string | Uint8Array> {
    let source = this.sources[filePath];
    if (!source) {
      for (const plugin of this.plugins) {
        if (
          plugin.load &&
          await plugin.test(filePath, data)
        ) {
          source = await plugin.load(
            filePath,
            data,
          );
          this.sources[filePath] = source;
          break;
        }
      }
      // this.logger.trace(colors.green("Get"), "source", filePath);
    } else {
      // this.logger.trace(colors.green("Load"), "source", filePath);
    }
    if (source === undefined) {
      throw Error(`no plugin for getSource found: ${filePath}`);
    }
    return source;
  }
  async createGraph(
    inputs: string[],
    {
      reload = false,
      optimize = false,
      initialGraph = {},
      cacheFilePath = this.cacheFilePath,
    }: {
      initialGraph?: Graph;
      reload?: boolean;
      optimize?: boolean;
      cacheFilePath?: string;
    } = {},
  ) {
    const time = performance.now();
    const list: Map<string, any> = new Map(inputs.map((input) => [input, {}]));
    const graph: Graph = {};

    const exists = await fs.exists(cacheFilePath);
    const mtime = exists && Deno.statSync(cacheFilePath).mtime!;

    const data: Data = {
      bundler: this,
      graph,
      chunks: new Map(),
      reload,
      optimize,
    };

    for (const [input, { type }] of list.entries()) {
      let asset = initialGraph[input];
      const filePath = resolveCache(input);

      // if asset does not exist or is outdated
      const needsAssetUpdate = reload || !asset || !exists ||
        mtime < Deno.statSync(filePath).mtime!;
      if (needsAssetUpdate) {
        let foundPlugin = false;
        const extension = path.extname(filePath);
        graph[input] = {
          input,
          output: this.createOutput(filePath, extension),
          filePath,
          imports: {},
          exports: {},
          type: type,
        };
        for (const plugin of this.plugins) {
          if (
            plugin.createAsset &&
            await plugin.test(
              input,
              data,
            )
          ) {
            foundPlugin = true;
            const time = performance.now();
            asset = await plugin.createAsset(
              input,
              data,
            );
            this.logger.debug(
              colors.green("Create"),
              "Asset",
              input,
              colors.dim(plugin.constructor.name),
              colors.dim(createTimestamp(time)),
            );
            break;
          }
        }
        if (!foundPlugin) {
          throw Error(`no plugin for createAsset found: ${input}`);
        }
      }
      Object.entries(asset.imports).forEach(([dependency, d]) => {
        list.set(dependency, d);
      });
      Object.entries(asset.exports).forEach(([dependency, d]) => {
        list.set(dependency, d);
      });
      graph[input] = asset;
    }
    this.logger.debug(
      colors.green("Create"),
      "Graph",
      colors.dim(createTimestamp(time)),
    );
    return graph;
  }

  async createChunk(
    dependency: string,
    inputHistory: string[],
    chunkList: string[][],
    data: Data,
  ) {
    let chunk: Chunk | undefined;
    for (const plugin of this.plugins) {
      if (
        plugin.createChunk &&
        await plugin.test(
          dependency,
          data,
        )
      ) {
        chunk = await plugin.createChunk(
          [...inputHistory, dependency],
          chunkList,
          data,
        );
        break;
      }
    }
    if (!chunk) {
      throw new Error(`no plugin for createChunk found: ${dependency}`);
    }
    return chunk;
  }
  async createChunks(
    inputs: string[],
    graph: Graph,
    { reload = false, optimize = false, chunks = new Map() }: {
      reload?: boolean;
      optimize?: boolean;
      chunks?: Chunks;
    },
  ) {
    const time = performance.now();
    const data = {
      bundler: this,
      graph,
      chunks,
      reload,
      optimize,
    };
    for (const bundleInput of inputs) {
      const chunkList = [
        [bundleInput],
      ];
      for (const inputHistory of chunkList) {
        let pluginName: string;
        const time = performance.now();
        const input = inputHistory[inputHistory.length - 1];
        const dependencyList: Set<string> = new Set([input]);
        for (const dependency of dependencyList) {
          for (const plugin of this.plugins) {
            if (
              plugin.createChunk &&
              await plugin.test(
                dependency,
                data,
              )
            ) {
              const chunk = await this.createChunk(
                dependency,
                inputHistory,
                chunkList,
                data,
              );

              if (input === dependency) {
                pluginName = plugin.constructor.name;
              }
              chunk.dependencies.forEach((dependency) =>
                dependencyList.add(dependency)
              );
            }
          }
        }
        this.logger.debug(
          colors.green("Create"),
          "Chunk",
          input,
          colors.dim(pluginName!),
          colors.dim(createTimestamp(time)),
        );
        chunks.set(
          input,
          new Chunk(this, {
            inputHistory,
            dependencies: dependencyList,
          }),
        );
      }
    }
    this.logger.debug(
      colors.green("Create"),
      "Chunks",
      colors.dim(createTimestamp(time)),
    );
    return chunks;
  }
  async createBundles(
    graph: Graph,
    chunks: Chunks,
    { reload = false, optimize = false }: {
      reload?: boolean;
      optimize?: boolean;
    } = {},
  ) {
    const time = performance.now();
    const bundles: Bundles = {};
    const data = {
      bundler: this,
      graph,
      chunks,
      reload,
      optimize,
    };
    for (const [input, chunk] of chunks.entries()) {
      let plugin: Plugin | undefined;
      for (const potentialPlugin of this.plugins) {
        if (
          potentialPlugin.createBundle &&
          await potentialPlugin.test(
            input,
            data,
          )
        ) {
          plugin = potentialPlugin;
        }
      }
      if (!plugin) {
        throw new Error(`no plugin for createBundle found: ${input}`);
      }

      const time = performance.now();
      const bundleSource = await plugin.createBundle!(
        chunk,
        data,
      );

      this.logger.debug(
        colors.green("Create"),
        "Bundle",
        input,
        colors.dim(plugin.constructor.name),
        colors.dim(createTimestamp(time)),
      );

      let bundleNeedsUpdate = false;
      const { output } = graph[input];
      if (bundleSource !== undefined) {
        bundleNeedsUpdate = true;
        bundles[output] = bundleSource;
        const size = typeof bundleSource === "string"
          ? new Blob([bundleSource]).size
          : bundleSource.length;
        this.logger.info(
          colors.blue("Bundle"),
          input,
          colors.dim("->"),
          colors.dim(output),
          colors.dim(humanizeSize(size)),
          colors.dim(createTimestamp(time)),
        );
      } else {
        this.logger.info(
          colors.blue("Up-To-Date"),
          input,
          colors.dim("->"),
          colors.dim(output),
          colors.dim(createTimestamp(time)),
        );
      }
      if (bundleNeedsUpdate && optimize) {
        for (const plugin of this.plugins) {
          if (
            plugin.optimize &&
            await plugin.test(
              input,
              data,
            )
          ) {
            const time = performance.now();
            bundles[output] = await plugin.optimize(
              output,
              bundles,
              data,
            );
            this.logger.debug(
              colors.green("Optimize"),
              input,
              colors.dim(plugin.constructor.name),
              colors.dim(createTimestamp(time)),
            );
          }
        }
      }
    }
    this.logger.debug(
      colors.green("Create"),
      "Bundles",
      colors.dim(createTimestamp(time)),
    );
    return bundles;
  }
  async transformSource(
    input: string,
    bundleInput: string,
    chunk: Chunk,
    data: Data,
  ) {
    let source = await chunk.getSource(input, data);
    for (const plugin of this.plugins) {
      if (
        plugin.transform &&
        await plugin.test(
          input,
          data,
        )
      ) {
        const time = performance.now();

        source = await plugin.transform(
          input,
          source,
          bundleInput,
          data,
        );
        this.logger.debug(
          colors.green("Transform"),
          input,
          colors.dim(plugin.constructor.name),
          colors.dim(`${Math.ceil(performance.now() - time)}ms`),
        );
      }
    }
    return source;
  }
  async bundle(
    inputs: string[],
    { initialGraph = {}, reload = false, optimize = false }: {
      initialGraph?: Graph;
      reload?: boolean;
      optimize?: boolean;
    } = {},
  ) {
    const graph = await this.createGraph(
      inputs,
      { initialGraph, reload, cacheFilePath: this.cacheFilePath },
    );
    // console.log(graph);
    const chunks = await this.createChunks(
      inputs,
      graph,
      { reload, optimize },
    );
    // console.log(chunks);
    const bundles = await this.createBundles(
      graph,
      chunks,
      { reload, optimize },
    );
    return { graph, chunks, bundles };
  }
}
