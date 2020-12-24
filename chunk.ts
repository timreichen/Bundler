import { Bundler } from "./bundler.ts";
import { colors, fs, path, Sha256 } from "./deps.ts";
import { Data, Source } from "./plugins/plugin.ts";

export class Chunk {
  bundler: Bundler;
  inputHistory: string[];
  dependencies: Set<string>;
  sources: Record<string, Source>;
  cache: Record<string, string>;
  constructor(bundler: Bundler, { inputHistory, dependencies }: {
    inputHistory: string[];
    dependencies: Set<string>;
  }) {
    this.inputHistory = inputHistory;
    this.dependencies = dependencies;
    this.bundler = bundler;
    this.sources = {};
    this.cache = {};
  }
  async getSource(filePath: string, data: Data) {
    let source = this.sources[filePath];
    if (source === undefined) {
      source = this.sources[filePath] = await this.bundler.getSource(
        filePath,
        data,
      );
    }
    return source;
  }

  createCacheFilePath(filePath: string) {
    const chunkCacheDirPath = new Sha256().update(
      this.inputHistory[this.inputHistory.length - 1],
    ).hex();
    const cacheFilePath = new Sha256().update(filePath).hex();
    return path.join(
      this.bundler.cacheDirPath,
      chunkCacheDirPath,
      cacheFilePath,
    );
  }
  async hasCache(input: string) {
    const cacheFilePath = this.createCacheFilePath(input);
    return this.cache[cacheFilePath] !== undefined ||
      await fs.existsSync(cacheFilePath) &&
        Deno.statSync(cacheFilePath).mtime! > Deno.statSync(input).mtime!;
  }
  async setCache(
    input: string,
    source: string,
  ) {
    const cacheFilePath = this.createCacheFilePath(input);
    this.bundler.logger.debug(
      colors.green("Create"),
      "Cache",
      input,
      colors.dim("->"),
      colors.dim(cacheFilePath),
    );
    this.cache[cacheFilePath] = source;
    await fs.ensureFile(cacheFilePath);
    await Deno.writeTextFile(cacheFilePath, source);
  }
  async getCache(input: string) {
    const cacheFilePath = this.createCacheFilePath(input);
    this.bundler.logger.debug(
      colors.green("Get"),
      "Cache",
      input,
      colors.dim(cacheFilePath),
    );
    return this.cache[cacheFilePath] || await Deno.readTextFile(cacheFilePath);
  }
}
