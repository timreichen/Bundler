#!/usr/bin/env -S deno run --unstable --allow-net --allow-read --allow-write --allow-env

import {
  Bundler,
  CSSPlugin,
  FilePlugin,
  HTMLPlugin,
  JSONPlugin,
  TerserPlugin,
  TypescriptPlugin,
  WebManifestPlugin,
} from "./mod.ts";
import {
  colors,
  flags,
  ImportMap,
  JSONC,
  mediaTypes,
  path,
  resolveImportMap,
  ts,
} from "./deps.ts";
import { parse, Program } from "./program/program.ts";
import {
  createSha256,
  exists,
  existsSync,
  formatBytes,
  isFileURL,
  isURL,
  parsePaths,
  timestamp,
} from "./_util.ts";
import {
  Asset,
  Bundle,
  Chunk,
  DependencyFormat,
  DependencyType,
  Plugin,
} from "./plugins/plugin.ts";
import { Logger } from "./log/logger.ts";
import { CacheMap } from "./plugins/cache_map.ts";
import { BundleOptions } from "./bundler.ts";
import { LiveReloadServer } from "./live_reload_server.ts";

function parseLogLevel(logLevelString: string) {
  switch (logLevelString) {
    case "info": {
      return Logger.logLevels.info;
    }
    case "debug": {
      return Logger.logLevels.debug;
    }
    default: {
      throw Error(`log level not supported: ${logLevelString}`);
    }
  }
}

function parseBundleArgs(args: flags.Args) {
  const {
    _,
    quiet = false,
    "log-level": logLevelString = "info",
    "out-dir": dist = "dist",
    optimize = false,
    watch = false,
    reload = false,
    "import-map": importMapPath,
    config,
  } = args;

  const root = isFileURL(dist) ? dist : path.resolve(Deno.cwd(), dist);
  const { inputs, outputMap } = parsePaths(_, root);
  const logLevel = parseLogLevel(logLevelString);

  return {
    inputs,
    outputMap,
    logLevel,
    quiet,
    root,
    optimize,
    watch,
    reload,
    importMapPath,
    config,
  };
}
function parseServeArgs(args: flags.Args) {
  const {
    _,
    quiet = false,
    "log-level": logLevelString = "info",
    "out-dir": dist = "dist",
    optimize = false,
    watch = false,
    reload = false,
    "import-map": importMapPath,
    config,
    port = 8080,
  } = args;

  const root = isFileURL(dist) ? dist : path.resolve(Deno.cwd(), dist);
  const { inputs, outputMap } = parsePaths(_, root);
  const logLevel = parseLogLevel(logLevelString);

  return {
    inputs,
    outputMap,
    logLevel,
    quiet,
    root,
    optimize,
    watch,
    reload,
    importMapPath,
    config,
    port,
  };
}

async function writeBundleFiles(bundler: Bundler, bundles: Bundle[]) {
  const time = performance.now();
  for (const bundle of bundles) {
    const time = performance.now();
    const output = path.fromFileUrl(bundle.output);
    const source = typeof bundle.source === "string"
      ? new TextEncoder().encode(bundle.source)
      : new Uint8Array(bundle.source);
    await Deno.mkdir(path.dirname(output), { recursive: true });
    await Deno.writeFile(output, source);
    const { size } = await Deno.stat(output);
    bundler.logger.info(
      colors.green("Write File"),
      output,
      colors.dim(formatBytes(size)),
      colors.dim(colors.italic(`(${timestamp(time)})`)),
    );
  }
  const length = bundles.length;
  if (length) {
    bundler.logger.info(
      colors.brightBlue("Write"),
      "Files",
      colors.dim(`${length} file${length === 1 ? "" : "s"}`),
      colors.dim(colors.italic(`(${timestamp(time)})`)),
    );
  }
}

async function createCachedAssetFilePath(
  cacheAssetDir: string,
  input: string,
  type: DependencyType,
  format: DependencyFormat,
) {
  const key = `${input} ${type} ${format}`;
  return path.join(
    cacheAssetDir,
    await createSha256(key),
  );
}

async function writeAssetFiles(cacheDir: string, cacheMap: CacheMap<Asset>) {
  Deno.mkdir(cacheDir, { recursive: true });
  for (const asset of cacheMap.values()) {
    const filePath = await createCachedAssetFilePath(
      cacheDir,
      asset.input,
      asset.type,
      asset.format,
    );
    await Deno.writeTextFile(
      filePath,
      JSON.stringify(asset),
    );
  }
}

async function loadAssetFiles(cacheDir: string, cacheMap: CacheMap<Asset>) {
  try {
    for await (const dirEntry of Deno.readDir(cacheDir)) {
      const filePath = path.join(
        cacheDir,
        dirEntry.name,
      );
      const asset: Asset = JSON.parse(
        await Deno.readTextFile(filePath),
      );
      const valid = await verifyAssetFile(asset.input, filePath);

      if (valid) {
        cacheMap.set(asset.input, asset.type, asset.format, asset);
      } else {
        await Deno.remove(filePath);
      }
    }
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
  }
}

function updateCacheMaps(
  filePath: string,
  assetCacheMap: CacheMap<Asset>,
  chunkCacheMap: CacheMap<Chunk>,
) {
  const removedAssets: Asset[] = [];
  const removedChunks: Chunk[] = [];
  for (const asset of assetCacheMap.values()) {
    if (asset.input === filePath) {
      assetCacheMap.delete(
        asset.input,
        asset.type,
        asset.format,
      );
      removedAssets.push(asset);
      for (const chunk of chunkCacheMap.values()) {
        if (
          chunk.item.input === filePath ||
          chunk.dependencyItems.some((dependencyItem) =>
            dependencyItem.input === filePath
          )
        ) {
          chunkCacheMap.delete(
            chunk.item.input,
            chunk.item.type,
            chunk.item.format,
          );
          removedChunks.push(chunk);
        }
      }
    }
  }
  return {
    removedAssets,
    removedChunks,
  };
}

async function verifyAssetFile(input: string, filePath: string) {
  if (isFileURL(input)) {
    try {
      input = path.fromFileUrl(input);
      const assetStat = await Deno.lstat(input);
      const cachedAssetFileStat = await Deno.lstat(filePath);
      if (cachedAssetFileStat.mtime && assetStat.mtime) {
        return cachedAssetFileStat.mtime > assetStat.mtime;
      }
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
    }
  }
  return false;
}

async function resolveDenoJsonFilePath(dir: string) {
  const denoJsonPath = path.join(dir, "deno.json");
  const denoJsoncPath = path.join(dir, "deno.jsonc");
  return await exists(denoJsonPath)
    ? denoJsonPath
    : await exists(denoJsoncPath)
    ? denoJsoncPath
    : undefined;
}
function parseDenoJson(filePath: string, source: string) {
  const extname = path.extname(filePath);
  switch (extname) {
    case ".jsonc": {
      return JSONC.parse(source);
    }
    case ".json":
    default: {
      return JSON.parse(source);
    }
  }
}

async function readFetchFile(filePath: string) {
  try {
    let source: string;
    if (isFileURL(filePath) || !isURL(filePath)) {
      source = await Deno.readTextFile(filePath);
    } else {
      source = await fetch(filePath).then((data) => data.text());
    }
    return source;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw console.error(
        colors.red("error"),
        `could not find the config file: ${filePath}`,
      );
    }
    throw error;
  }
}

async function getOptions(
  denoJsonFilePath?: string,
  importMapPath?: string,
) {
  let compilerOptions: ts.CompilerOptions = {};
  let importMap: ImportMap | undefined;

  const root = Deno.cwd();

  denoJsonFilePath = denoJsonFilePath ?? await resolveDenoJsonFilePath(root);

  let importMapFilePath = importMapPath;

  if (denoJsonFilePath) {
    const source = await readFetchFile(denoJsonFilePath);
    const json = parseDenoJson(denoJsonFilePath, source);
    if (json) {
      if (json.compilerOptions) {
        compilerOptions =
          ts.convertCompilerOptionsFromJson(json.compilerOptions, root).options;
      }
      if (!importMapFilePath) {
        importMapFilePath = json.importMap;
      }
    }
  }

  if (importMapFilePath) {
    const source = await readFetchFile(importMapFilePath);
    importMap = resolveImportMap(
      JSON.parse(source),
      path.toFileUrl(importMapFilePath),
    );
  }

  return { compilerOptions, importMap };
}

async function watchAssetFiles(
  bundler: Bundler,
  assetCacheMap: CacheMap<Asset>,
  chunkCacheMap: CacheMap<Chunk>,
) {
  bundler.logger.info(
    colors.brightBlue(`Watcher`),
    "Process finished. Restarting on file change...",
  );

  const filePaths = [...assetCacheMap.values()]
    .filter((asset) => isFileURL(asset.input) || !isURL(asset.input))
    .map((asset) => new URL(asset.input))
    .map((url) => url.pathname)
    .filter((pathname) => existsSync(pathname));

  const watcher = Deno.watchFs(filePaths);
  for await (const event of watcher) {
    switch (event.kind) {
      case "modify":
      case "remove":
      case "create": {
        bundler.logger.info(
          colors.brightBlue(`Watcher`),
          "File change detected! Restarting!",
        );
        for (let filePath of event.paths) {
          filePath = path.toFileUrl(filePath).href;
          const { removedAssets } = updateCacheMaps(
            filePath,
            assetCacheMap,
            chunkCacheMap,
          );
          for (const removedAsset of removedAssets) {
            bundler.cacheMap.delete(
              removedAsset.input,
              removedAsset.type,
              removedAsset.format,
            );
          }
        }
        // FIXME: Uncaught BadResource: Bad resource ID when trying to close watcher
        // watcher.close();
        return;
      }
    }
  }
}

class FileBundler extends EventTarget {
  bundler: Bundler;
  options: BundleOptions;
  assetCacheMap: CacheMap<Asset>;
  chunkCacheMap: CacheMap<Chunk>;

  constructor(
    { plugins }: { plugins: Plugin[] },
    options: BundleOptions & { logLevel?: number; quiet?: boolean },
  ) {
    super();
    this.bundler = new Bundler({
      plugins,
      logLevel: options.logLevel,
      quiet: options.quiet,
    });

    this.options = options;
    this.assetCacheMap = new CacheMap<Asset>();
    this.chunkCacheMap = new CacheMap<Chunk>();
  }

  createAssetCacheDir(root: string) {
    const cacheDir = path.join(root, ".bundler");
    const assetCacheDir = path.join(cacheDir, "assets");
    return assetCacheDir;
  }

  async #bundle(
    inputs: string[],
    { root, assetCacheDir, watch, reload }: {
      root: string;
      assetCacheDir: string;
      watch?: boolean;
      reload?: boolean;
    },
  ) {
    const time = performance.now();

    const { outputMap, optimize, importMap } = this.options;

    const { assets, chunks, bundles } = await this.bundler.bundle(inputs, {
      outputMap,
      optimize,
      reload,
      root,
      importMap,
      assets: [...this.assetCacheMap.values()],
      chunks: [...this.chunkCacheMap.values()],
    });

    for (const asset of assets) {
      this.assetCacheMap.set(
        asset.input,
        asset.type,
        asset.format,
        asset,
      );
    }

    for (const chunk of chunks) {
      this.chunkCacheMap.set(
        chunk.item.input,
        chunk.item.type,
        chunk.item.format,
        chunk,
      );
    }

    this.bundler.logger.info(
      colors.green(`Done`),
      `${assets.length} asset${assets.length > 1 ? "s" : ""},`,
      `${chunks.length} chunk${chunks.length > 1 ? "s" : ""},`,
      `${bundles.length} bundle${bundles.length > 1 ? "s" : ""}`,
      colors.dim(colors.italic(`(${timestamp(time)})`)),
    );
    this.dispatchEvent(
      new CustomEvent("bundled", { detail: { assets, chunks, bundles } }),
    );

    if (watch) {
      await watchAssetFiles(
        this.bundler,
        this.assetCacheMap,
        this.chunkCacheMap,
      );
      await this.#bundle(inputs, { root, assetCacheDir, watch });
    }
  }

  async bundle(
    inputs: string[],
    root: string,
    { watch, reload }: { watch?: boolean; reload?: boolean },
  ) {
    const assetCacheDir = this.createAssetCacheDir(root);
    await loadAssetFiles(assetCacheDir, this.assetCacheMap);
    await this.#bundle(inputs, { root, assetCacheDir, watch, reload });
  }
}

const program: Program = {
  name: "bundler",
  description: "Bundler for deno",
  commands: [
    {
      name: "bundle",
      description: "Bundle file(s)",
      async fn(args: flags.Args) {
        const {
          inputs,
          outputMap,
          logLevel,
          quiet,
          root,
          optimize,
          watch,
          reload,
          importMapPath,
          config,
        } = parseBundleArgs(args);

        const { compilerOptions, importMap } = await getOptions(
          config,
          importMapPath,
        );

        const plugins = [
          new HTMLPlugin(),
          new CSSPlugin(),
          new TypescriptPlugin(compilerOptions),
          new JSONPlugin(),
          new WebManifestPlugin(),
          new TerserPlugin(),
          new FilePlugin(),
        ];

        const fileBundler = new FileBundler({ plugins }, {
          outputMap,
          logLevel,
          quiet,
          optimize,
          reload,
          importMap,
        });

        fileBundler.addEventListener("bundled", async (event) => {
          const { bundles } = (event as CustomEvent).detail;
          await writeBundleFiles(fileBundler.bundler, bundles);
          await writeAssetFiles(
            fileBundler.createAssetCacheDir(root),
            fileBundler.assetCacheMap,
          );
        });

        await fileBundler.bundle(inputs, root, { watch });
      },
      arguments: [
        {
          name: "source_file",
          description: "Script arg",
          multiple: true,
        },
      ],
      options: [
        {
          name: "config",
          description:
            `The configuration file can be used to configure different aspects of\ndeno including TypeScript, linting, and code formatting. Typically
          the configuration file will be called \`deno.json\` or \`deno.jsonc\`\nand automatically detected; in that case this flag is not necessary.\nSee
          https://deno.land/manual@v1.22.0/getting_started/configuration_file`,
          alias: "c",
          args: [{ name: "FILE" }],
        },
        {
          name: "help",
          description: "Print help information",
          alias: "h",
        },
        {
          name: "import-map",
          description:
            `Load import map file from local file or remote URL.\nDocs: https://deno.land/manual/linking_to_external_code/import_maps\nSpecification: https://wicg.github.io/import-maps/\nExamples: https://github.com/WICG/import-maps#the-import-map`,
          args: [{ name: "FILE" }],
        },
        {
          name: "log-level",
          description: `Set log level [possible values: debug, info]`,
          alias: "L",
          args: [{ name: "log-level" }],
        },

        {
          name: "optimize",
          description: `Minify source code`,
          boolean: true,
        },
        {
          name: "out-dir",
          description: "Name of out_dir",
          args: [{ name: "DIR" }],
        },
        {
          name: "quiet",
          description: "Suppress diagnostic output",
          alias: "q",
          boolean: true,
        },
        // {
        //   name: "reload",
        //   description:
        //     `Reload source code cache (recompile TypeScript)\n--reload\nReload everything\n--reload=https://deno.land/std\nReload only standard modules\n--reload=https://deno.land/std/fs/utils.ts,https://deno.land/std/fmt/colors.ts\nReloads specific modules`,
        //   alias: "r",
        //   boolean: true,
        // },
        {
          name: "watch",
          description: `Watch files and re-bundle on change`,
          boolean: true,
        },
      ],
    },
    {
      name: "serve",
      description: "Bundle file(s)",
      async fn(args: flags.Args) {
        const {
          inputs,
          outputMap,
          logLevel,
          quiet,
          root,
          optimize,
          reload,
          importMapPath,
          config,
          port,
        } = parseServeArgs(args);

        const { compilerOptions, importMap } = await getOptions(
          config,
          importMapPath,
        );

        const plugins = [
          new HTMLPlugin(),
          new CSSPlugin(),
          new TypescriptPlugin(compilerOptions),
          new JSONPlugin(),
          new WebManifestPlugin(),
          new TerserPlugin(),
          new FilePlugin(),
        ];

        const fileBundler = new FileBundler({ plugins }, {
          outputMap,
          logLevel,
          quiet,
          optimize,
          reload,
          importMap,
        });

        const liveReloadPort = 35729;
        const liveReloadServer = new LiveReloadServer();
        liveReloadServer.serve(liveReloadPort);

        const server = Deno.listen({ port });

        (async () => {
          for await (const conn of server) {
            serveHttp(conn);
          }
          async function serveHttp(conn: Deno.Conn) {
            const httpConn = Deno.serveHttp(conn);
            for await (const requestEvent of httpConn) {
              const { request, respondWith } = requestEvent;
              let body;
              let status = 404;
              const headers = new Headers();

              const url = new URL(request.url);
              let pathname = url.pathname;
              if (pathname === "/") {
                pathname = "/index.html";
              }

              const bundle = bundles[pathname];

              if (bundle) {
                body = bundle.source;
                if (url.pathname === "/") {
                  body +=
                    `<script src="http://localhost:${liveReloadPort}/livereload.js"></script>`;
                }
                status = 200;
                const contentType = mediaTypes.contentType(
                  path.extname(pathname),
                );
                if (contentType) headers.set("content-type", contentType);
              }

              const response = new Response(body, { status, headers });
              respondWith(response);
            }
          }
        })();

        let bundles: Record<string, Bundle> = {};
        fileBundler.addEventListener("bundled", (event) => {
          const newBundles = (event as unknown as CustomEvent).detail
            .bundles as Bundle[];

          bundles = {
            ...bundles,
            ...Object.fromEntries(
              newBundles.map((
                bundle,
              ) => [
                "/" + path.relative(root, path.fromFileUrl(bundle.output)),
                bundle,
              ]),
            ),
          };
          liveReloadServer.reload();
        });

        console.info(
          `HTTP webserver running.  Access it at: http://localhost:${port}/`,
        );

        await fileBundler.bundle(inputs, root, { watch: true, reload: true });
      },
      arguments: [
        {
          name: "source_file",
          description: "Script arg",
          multiple: true,
        },
      ],
      options: [
        {
          name: "config",
          description:
            `The configuration file can be used to configure different aspects of\ndeno including TypeScript, linting, and code formatting. Typically
          the configuration file will be called \`deno.json\` or \`deno.jsonc\`\nand automatically detected; in that case this flag is not necessary.\nSee
          https://deno.land/manual@v1.22.0/getting_started/configuration_file`,
          alias: "c",
          args: [{ name: "FILE" }],
        },
        {
          name: "help",
          description: "Print help information",
          alias: "h",
        },
        {
          name: "import-map",
          description:
            `Load import map file from local file or remote URL.\nDocs: https://deno.land/manual/linking_to_external_code/import_maps\nSpecification: https://wicg.github.io/import-maps/\nExamples: https://github.com/WICG/import-maps#the-import-map`,
          args: [{ name: "FILE" }],
        },
        {
          name: "log-level",
          description: `Set log level [possible values: debug, info]`,
          alias: "L",
          args: [{ name: "log-level" }],
        },

        {
          name: "optimize",
          description: `Minify source code`,
          boolean: true,
        },
        {
          name: "out-dir",
          description: "Name of out_dir",
          args: [{ name: "DIR" }],
        },
        {
          name: "quiet",
          description: "Suppress diagnostic output",
          alias: "q",
          boolean: true,
        },
        // {
        //   name: "reload",
        //   description:
        //     `Reload source code cache (recompile TypeScript)\n--reload\nReload everything\n--reload=https://deno.land/std\nReload only standard modules\n--reload=https://deno.land/std/fs/utils.ts,https://deno.land/std/fmt/colors.ts\nReloads specific modules`,
        //   alias: "r",
        //   boolean: true,
        // },
      ],
    },
  ],
};

await parse(program, Deno.args);
