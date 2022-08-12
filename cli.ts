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
  path,
  resolveImportMap,
  ts,
} from "./deps.ts";
import { parse, Program } from "./program/program.ts";
import {
  createSha256,
  formatBytes,
  isFileURL,
  isURL,
  parsePaths,
  timestamp,
} from "./_util.ts";
import { Asset, Bundle, Chunk } from "./plugins/plugin.ts";
import { Logger } from "./log/logger.ts";

async function writeBundles(bundler: Bundler, bundles: Bundle[]) {
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

async function writeCacheAssets(
  cachedAssets: Record<string, Asset>,
  cacheAssetsDir: string,
) {
  for (const [input, cachedAsset] of Object.entries(cachedAssets)) {
    Deno.mkdir(cacheAssetsDir, { recursive: true });
    const cachedAssetFilepath = path.join(
      cacheAssetsDir,
      await createSha256(input),
    );
    await Deno.writeTextFile(
      cachedAssetFilepath,
      JSON.stringify(cachedAsset),
    );
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

  if (reload) {
    if (reload && Array.isArray(reload)) {
      // reload = reload.map((filepath) =>
      //   filepath = new URL(path.resolve(Deno.cwd(), filepath), "file://").href
      // );
    }
  }
  const root = isFileURL(dist) ? dist : path.resolve(Deno.cwd(), dist);
  const { inputs, outputMap } = parsePaths(_, root);

  let logLevel;
  switch (logLevelString) {
    case "info": {
      logLevel = Logger.logLevels.info;
      break;
    }
    case "debug": {
      logLevel = Logger.logLevels.debug;
      break;
    }
    default: {
      throw Error(`log level not supported: ${logLevelString}`);
    }
  }

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

async function exists(filename: string) {
  try {
    await Deno.stat(filename);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    throw error;
  }
}

async function bundleCommand(args: flags.Args) {
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

  const cacheDir = path.resolve(root, ".bundler");
  const cacheAssetsDir = path.join(cacheDir, "assets");

  let compilerOptions: ts.CompilerOptions = {};
  let importMap: ImportMap;

  const denoJsonPath = path.join(Deno.cwd(), "deno.json");
  const denoJsoncPath = path.join(Deno.cwd(), "deno.jsonc");
  const configPath: string = config ??
    (await exists(denoJsonPath) && denoJsonPath) ??
    (await exists(denoJsoncPath) && denoJsoncPath);

  let importMapFilePath = importMapPath;
  if (configPath) {
    try {
      let source: string;
      if (isFileURL(configPath) || !isURL(configPath)) {
        source = await Deno.readTextFile(configPath);
      } else {
        source = await fetch(configPath).then((data) => data.text());
      }
      const json = JSON.parse(source);
      importMapFilePath = importMapFilePath ?? json.importMap;
      compilerOptions = (json && json.compilerOptions) ??
        ts.convertCompilerOptionsFromJson(
          json.compilerOptions,
          Deno.cwd(),
        ).options;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        console.error(
          colors.red("error"),
          `could not find the config file: ${configPath}`,
        );
        return;
      }
      throw error;
    }
  }
  if (importMapFilePath) {
    try {
      let source: string;
      if (isFileURL(importMapFilePath) || !isURL(importMapFilePath)) {
        importMapFilePath = path.resolve(Deno.cwd(), importMapFilePath);
        source = await Deno.readTextFile(importMapFilePath);
      } else {
        source = await fetch(importMapFilePath).then((data) => data.text());
      }

      importMap = resolveImportMap(
        JSON.parse(source),
        path.toFileUrl(importMapFilePath),
      );
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        console.error(
          colors.red("error"),
          `could not find import map file: ${importMapPath}`,
        );
        return;
      }
      throw error;
    }
  }

  const plugins = [
    new HTMLPlugin(),
    new CSSPlugin(),
    new TypescriptPlugin(compilerOptions),
    new JSONPlugin(),
    new WebManifestPlugin(),
    new TerserPlugin(),
    new FilePlugin(),
  ];

  const bundler = new Bundler({ plugins, logLevel, quiet });

  let cachedAssets: Record<string, Asset> = {};
  let cachedChunks: Record<string, Chunk> = {};

  try {
    for await (const dirEntry of Deno.readDir(cacheAssetsDir)) {
      const cachedAssetFilepath = path.join(cacheAssetsDir, dirEntry.name);
      const asset: Asset = JSON.parse(
        await Deno.readTextFile(cachedAssetFilepath),
      );

      let cacheExpired = false;
      if (isFileURL(asset.input)) {
        try {
          const input = path.fromFileUrl(asset.input);
          const assetStat = await Deno.lstat(input);
          const cachedAssetFileStat = await Deno.lstat(cachedAssetFilepath);
          if (cachedAssetFileStat.mtime && assetStat.mtime) {
            cacheExpired = cachedAssetFileStat.mtime < assetStat.mtime;
          }
        } catch (error) {
          if (!(error instanceof Deno.errors.NotFound)) {
            throw error;
          }
        }
      }

      if (!cacheExpired) {
        try {
          cachedAssets[asset.input] = asset;
          continue;
        } catch (error) {
          if (!(error instanceof Deno.errors.NotFound)) {
            throw error;
          }
        }
        cachedAssets[asset.input] = asset;
      }
      await Deno.remove(cachedAssetFilepath);
    }
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
  }

  async function bundle() {
    const time = performance.now();

    const { assets, chunks, bundles } = await bundler.bundle(inputs, {
      outputMap,
      optimize,
      reload,
      root,
      importMap,
      assets: Object.values(cachedAssets),
      chunks: Object.values(cachedChunks),
    });

    cachedAssets = {
      ...cachedAssets,
      ...Object.fromEntries(
        assets.map((asset) => [asset.input, asset]),
      ),
    };

    cachedChunks = {
      ...cachedChunks,
      ...Object.fromEntries(
        chunks.map((chunk) => [chunk.item.input, chunk]),
      ),
    };

    await writeBundles(
      bundler,
      bundles,
    );

    bundler.logger.info(
      colors.green(`Done`),
      `${assets.length} asset${assets.length > 1 ? "s" : ""},`,
      `${chunks.length} chunk${chunks.length > 1 ? "s" : ""},`,
      `${bundles.length} bundle${bundles.length > 1 ? "s" : ""}`,
      colors.dim(colors.italic(`(${timestamp(time)})`)),
    );

    await writeCacheAssets(cachedAssets, cacheAssetsDir);

    if (watch) {
      const paths = Object.values(cachedAssets)
        .map((asset) => new URL(asset.input).pathname)
        .filter((pathname) => {
          try {
            Deno.statSync(pathname);
            return true;
          } catch (error) {
            if (error instanceof Deno.errors.NotFound) {
              return false;
            }
            throw error;
          }
        });

      const watcher = Deno.watchFs(paths);
      bundler.logger.info(
        colors.brightBlue(`Watcher`),
        "Process finished. Restarting on file change...",
      );

      for await (const event of watcher) {
        switch (event.kind) {
          case "modify":
          case "remove":
          case "create": {
            bundler.logger.info(
              colors.brightBlue(`Watcher`),
              "File change detected! Restarting!",
            );
            for (const filepath of event.paths) {
              try {
                const fileURL = path.toFileUrl(filepath).href;
                const cachedAsset = cachedAssets[fileURL];
                bundler.sourceMap.delete(
                  cachedAsset.input,
                  cachedAsset.type,
                  cachedAsset.format,
                );
                delete cachedAssets[fileURL];
                for (const [input, chunk] of Object.entries(cachedChunks)) {
                  if (
                    chunk.item.input === fileURL ||
                    chunk.dependencyItems.some((dependencyItem) =>
                      dependencyItem.input === fileURL
                    )
                  ) {
                    delete cachedChunks[input];
                  }
                }
              } catch {
                //
              }
            }
            await bundle();
            watcher.close();
            break;
          }
        }
      }
    }
  }

  await bundle();
}

const program: Program = {
  name: "bundler",
  description: "Bundler for deno",
  commands: [
    {
      name: "bundle",
      description: "Bundle file(s)",
      fn: bundleCommand,
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
  ],
};

await parse(program, Deno.args);
