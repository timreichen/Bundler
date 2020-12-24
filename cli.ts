import { Bundler } from "./bundler.ts";
import {
  Args,
  colors,
  fs,
  ImportMap,
  path,
  postcssPresetEnv,
  Sha256,
  ts,
} from "./deps.ts";
import { invalidSubcommandError, Program } from "./deps.ts";
import { Graph } from "./graph.ts";
import { Logger, LogLevel, logLevels } from "./logger.ts";
import { CssPlugin } from "./plugins/css/css.ts";
import { CssoPlugin } from "./plugins/css/csso.ts";
import { CssInjectOutputsPlugin } from "./plugins/css/inject_outputs.ts";
import { HtmlPlugin } from "./plugins/html/html.ts";
import { ImagePlugin } from "./plugins/image/image.ts";
import { SvgPlugin } from "./plugins/image/svg.ts";
import { JSONPlugin } from "./plugins/json/json.ts";
import { WebmanifestPlugin } from "./plugins/json/webmanifest.ts";
import { Plugin } from "./plugins/plugin.ts";
import { SystemPlugin } from "./plugins/typescript/system.ts";
import { TerserPlugin } from "./plugins/typescript/terser.ts";
import { TypescriptPlugin } from "./plugins/typescript/typescript.ts";
import { isURL, removeRelativePrefix } from "./_util.ts";

const use = [
  postcssPresetEnv({
    stage: 2,
    features: {
      "nesting-rules": true,
    },
  }),
];

interface Meta {
  graph: Graph;
}

const hashes: { [file: string]: string } = {};
const logger = new Logger({ logLevel: logLevels.info });

async function main(data: {
  inputs: string[];
  initialGraph: Graph;
  compilerOptions: ts.CompilerOptions;
  importMap: ImportMap;
  outputMap: any;
  outDirPath: string;
  depsDirPath: string;
  cacheDirPath: string;
  cacheFilePath: string;

  logLevel: LogLevel;
  reload: boolean;
  optimize: boolean;
  watch: boolean;
}) {
  const {
    inputs,
    initialGraph,
    compilerOptions,
    importMap,
    outputMap,
    outDirPath,
    depsDirPath,
    cacheDirPath,
    cacheFilePath,

    logLevel,
    reload,
    optimize,
    watch,
  } = data;

  const plugins: Plugin[] = [
    new TypescriptPlugin({
      test: (input: string) =>
        /\.(t|j)sx?$/.test(input) ||
        (isURL(input) && !/([\.][a-zA-Z]\w*)$/.test(input)),
    }),
    new CssPlugin({ use }),
    new HtmlPlugin(),
    new ImagePlugin(),
    new SvgPlugin(),
    new JSONPlugin(),
    new WebmanifestPlugin(),
    new SystemPlugin({ compilerOptions }),
    new CssInjectOutputsPlugin(),
    new CssoPlugin(),
    new TerserPlugin({
      test: (input: string) => /\.(t|j)sx?$/.test(input),
    }),
  ];

  const bundler = new Bundler(plugins, {
    importMap,
    outputMap,
    outDirPath,
    depsDirPath,
    cacheDirPath,
    cacheFilePath,

    logLevel,
  });

  try {
    const time = performance.now();
    const { bundles, graph } = await bundler.bundle(
      inputs,
      { initialGraph, reload, optimize },
    );

    for (const [output, source] of Object.entries(bundles)) {
      await fs.ensureFile(output);
      if (typeof source === "string") {
        await Deno.writeTextFile(output, source);
      } else {
        await Deno.writeFile(output, source);
      }
    }

    // TODO check if has changes
    await fs.ensureFile(cacheFilePath);
    await Deno.writeTextFile(
      cacheFilePath,
      JSON.stringify({ graph: graph }, null, " "),
    );

    logger.info(
      colors.blue("Done"),
      `${Math.ceil(performance.now() - time)}ms`,
    );

    if (watch) {
      await watchFn(graph);
    }
  } catch (error) {
    console.error(error);
    if (watch) {
      await watchFn(initialGraph);
    }
  }

  async function watchFn(graph: Graph) {
    const paths = Object.values(graph).map((entry) => entry.filePath);
    for (const path of paths) {
      if (!hashes[path]) {
        hashes[path] = new Sha256().update(await Deno.readFile(path)).hex();
      }
    }

    const watcher = Deno.watchFs(paths);
    // only reload on first time when watched
    logger.info(
      colors.blue(`Watcher`),
      `Process terminated! Restarting on file change...`,
    );

    logger.debug(colors.blue(`Watch`), paths);
    let needsUpdate = false;
    loop:
    for await (const { kind, paths } of watcher) {
      // checks if actual file content changed
      if (kind === "modify") {
        for (const filePath of paths) {
          const hash = new Sha256().update(await Deno.readFile(filePath))
            .hex();
          if (hashes[filePath] !== hash) {
            hashes[filePath] = hash;
            needsUpdate = true;
            break loop;
          }
        }
      } else {
        needsUpdate = true;
        break loop;
      }
    }

    logger.info(
      colors.blue(`Watcher`),
      `File change detected! Restarting!`,
    );
    setTimeout(async () => {
      try {
        await main({ ...data, reload: false });
      } catch (error) {
        console.error(error);
        await watchFn(graph);
      }
    }, 100);
  }
}

async function runBundle(
  {
    _,
    "out-dir": outDir = "dist",
    "import-map": importMapPath,
    config: configFilePath,
    optimize,
    reload,
    watch,
    "log-level": logLevelName,
    quiet,
  }: Args,
) {
  let logLevel = logLevels.info;

  if (logLevelName) {
    if (!["debug", "info"].includes(logLevelName)) {
      throw Error(
        `'${logLevelName}' isn't a valid value for '--log-level <log-level>'\n[possible values: debug, info]`,
      );
    }
    logLevel = quiet
      ? logLevels.none
      : logLevels[logLevelName as keyof typeof logLevels];
  }

  const inputs: string[] = [];

  const outputMap: { [input: string]: string } = {};

  for (const inp of _) {
    let [input, name] = String(inp).split("=");
    input = removeRelativePrefix(input);

    inputs.push(input);
    if (name) {
      outputMap[input] = path.join(outDir, name);
    }
  }

  const depsDirName = "deps";
  const cacheDirName = ".cache";
  const cacheFileName = "cache.json";

  const outDirPath = outDir;
  const depsDirPath = path.join(outDir, depsDirName);
  const cacheDirPath = path.join(outDir, cacheDirName);
  const cacheFilePath = path.join(cacheDirPath, cacheFileName);

  const { graph: initialGraph }: Meta = fs.existsSync(cacheFilePath)
    ? JSON.parse(await Deno.readTextFile(cacheFilePath))
    : { graph: {} };

  const config = configFilePath && fs.existsSync(configFilePath)
    ? JSON.parse(await Deno.readTextFile(configFilePath))
    : {};
  const compilerOptions = config.compilerOptions
    ? ts.convertCompilerOptionsFromJson(
      config.compilerOptions,
      Deno.cwd(),
    )
    : {};
  const importMap: ImportMap =
    (importMapPath
      ? JSON.parse(await Deno.readTextFile(importMapPath))
      : { imports: {} });
  await main({
    inputs,
    initialGraph,
    compilerOptions,
    importMap,
    outputMap,
    outDirPath,
    depsDirPath,
    cacheDirPath,
    cacheFilePath,

    logLevel,
    reload,
    optimize,
    watch,
  });
}

const program = new Program(
  { name: "bundler", description: "Bundler for deno" },
);

program
  .command({
    name: "bundle",
    description: "Bundle file to esm javsacript file",
    // help: false,
    fn: runBundle,
  })
  .argument({
    name: "file",
  })
  .option({
    name: "config",
    args: [{ name: "FILE" }],
    alias: "c",
    description: "Load tsconfig.json configuration file",
  })
  .option({
    name: "out-dir",
    args: [{ name: "DIR" }],
    description: "Name of out_dir",
  })
  .option({
    name: "help",
    alias: "h",
    description: "Prints help information",
  })
  .option({
    name: "import-map",
    args: [{ name: "FILE" }],
    description: `UNSTABLE:
Load import map file
Docs: https://deno.land/manual/linking_to_external_code/import_maps
Specification: https://wicg.github.io/import-maps/
Examples: https://github.com/WICG/import-maps#the-import-map`,
  })
  .option({
    name: "log-level",
    alias: "L",
    description: "Set log level [possible values: debug, info]",
    args: [{ name: "log-level" }],
  })
  .option({
    name: "optimize",
    boolean: true,
    description: `Minify source code`,
  })
  .option({
    name: "quiet",
    alias: "q",
    description: "Suppress diagnostic output",
  })
  .option({
    name: "reload",
    alias: "r",
    boolean: true,
    description: `Reload source code`,
    //     description: `Reload source code (recompile TypeScript)
    // --reload
    //   Reload everything
    // --reload=https://deno.land/std
    //   Reload only standard modules
    // --reload=https://deno.land/std/fs/utils.ts,https://deno.land/std/fmt/colors.ts
    //   Reloads specific modules`,
  })
  .option({
    name: "watch",
    boolean: true,
    description: `Watch files and re-bundle on change`,
  });

function help(args: { [key: string]: string }) {
  const { _ } = args;

  if (!_.length) {
    return program.help();
  }
  for (const cmd of _) {
    if (!program.commands[cmd]) {
      return console.error(
        invalidSubcommandError(cmd, Object.keys(program.commands)),
      );
    }
  }
  const cmd = _[0];
  const command = program.commands[cmd];

  return command.help();
}

program
  .command({
    name: "help",
    description: "Prints this message or the help of the given subcommand(s)",
    fn(args: Args) {
      help(args);
    },
  });

await program.parse(Deno.args);
