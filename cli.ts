import { Bundler } from "./bundler.ts";
import { Args, colors, fs, path, ts } from "./deps.ts";
import { invalidSubcommandError, Program } from "./deps.ts";
import { Graph } from "./graph.ts";
import { Logger, LogLevel, logLevels } from "./logger.ts";
import { OutputMap, Plugin } from "./plugins/plugin.ts";
import { readTextFile, removeRelativePrefix } from "./_util.ts";
import { createDefaultPlugins } from "./defaults.ts";
import { Watcher } from "./watcher.ts";

type Options = {
  inputs: string[];
  initialGraph: Graph;
  compilerOptions: Deno.CompilerOptions;
  importMap: Deno.ImportMap;
  outputMap: OutputMap;
  outDirPath: string;
  depsDirPath: string;
  cacheDirPath: string;
  cacheFilePath: string;

  logLevel: LogLevel;
  reload: boolean;
  optimize: boolean;
  watch: boolean;
  quiet: boolean;
};

const depsDirName = "deps";
const cacheDirName = ".cache";
const cacheFileName = "cache.json";

interface CacheData {
  graph: Graph;
}

const logLevelNames = ["trace", "debug", "info"];
function getLogLevel(logLevelName: string): LogLevel {
  if (!logLevelNames.includes(logLevelName)) {
    throw Error(
      `'${logLevelName}' isn't a valid value for '--log-level <log-level>'\n[possible values: ${
        logLevelNames.join(", ")
      }]`,
    );
  }
  return logLevels[logLevelName as keyof typeof logLevels];
}

function parseEntries(_: any, outDir: string) {
  const entries: {
    output: string;
    input: string;
    options: Record<string, any>;
  }[] = [];

  for (const inp of _) {
    const match =
      /^(?<input>(?:[^\=]|[\w\/\\\.])+?)(?:\=(?<output>(?:[^\=]|[\w\/\\\.])+?))?(?:\{(?<options>.*?)\})?$/
        .exec(inp);

    const { input: inputString, output, options: optionString } = match
      ?.groups!;
    const input = removeRelativePrefix(inputString);

    let options = {};
    if (optionString) {
      const optionStrings = optionString.split(",");
      const optionPairs = optionStrings.map((string) => string.split("="));
      options = Object.fromEntries(optionPairs);
    }
    entries.push({
      output,
      input,
      options,
    });
  }
  return entries;
}

async function createOptions({
  _,
  "out-dir": outDir = "dist",
  "import-map": importMapPath,
  config: configFilePath,
  optimize,
  reload,
  watch,
  "log-level": logLevelName,
  quiet,
}: Args): Promise<Options> {
  const logLevel = (logLevelName ? getLogLevel(logLevelName) : logLevels.info);

  const entries = parseEntries(_, outDir);

  const outputMap: OutputMap = {};
  const inputs: string[] = [];
  for (const { input, output } of entries) {
    inputs.push(input);
    if (output) {
      outputMap[input] = path.join(outDir, output);
    }
  }

  const outDirPath = outDir;
  const depsDirPath = path.join(outDir, depsDirName);
  const cacheDirPath = path.join(outDir, cacheDirName);
  const cacheFilePath = path.join(cacheDirPath, cacheFileName);

  const { graph: initialGraph }: CacheData = fs.existsSync(cacheFilePath)
    ? JSON.parse(await readTextFile(cacheFilePath))
    : { graph: {} };

  const config = configFilePath && fs.existsSync(configFilePath)
    ? JSON.parse(await readTextFile(configFilePath))
    : {};
  const compilerOptions = config.compilerOptions || {};

  const importMap: Deno.ImportMap =
    (importMapPath
      ? JSON.parse(await readTextFile(importMapPath))
      : { imports: {} });

  return {
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
    reload: typeof reload === "string" ? reload.split(",") : reload,
    optimize,
    watch,
    quiet,
  };
}

async function bundleCommand(
  args: Args,
) {
  const options = await createOptions(args);

  const plugins: Plugin[] = createDefaultPlugins({
    typescriptCompilerOptions: {
      // custom compiler options
      ...options.compilerOptions,
    },
  });

  const logger = new Logger({
    logLevel: options.logLevel,
    quiet: options.quiet,
  });
  const bundler = new Bundler(plugins, { logger });
  const watcher = new Watcher();

  async function bundleFunction() {
    try {
      let {
        inputs,
        initialGraph,
        importMap,
        outputMap,
        outDirPath,
        // depsDirPath,
        // cacheDirPath,
        cacheFilePath,
        reload,
        optimize,
      } = options;

      const { cache, graph, bundles } = await bundler.bundle(inputs, {
        importMap,
        graph: initialGraph,
        outputMap,
        outDirPath,
        optimize,
        reload,
      });

      for (const [cacheFilePath, source] of Object.entries(cache)) {
        await fs.ensureFile(cacheFilePath);
        await Deno.writeTextFile(cacheFilePath, source as string);
      }

      for (const [output, source] of Object.entries(bundles)) {
        await fs.ensureFile(output);
        if (typeof source === "string") {
          await Deno.writeTextFile(output, source);
        } else {
          await Deno.writeFile(output, source as Uint8Array);
        }
      }

      // TODO check if has changes
      await fs.ensureFile(cacheFilePath);
      await Deno.writeTextFile(
        cacheFilePath,
        JSON.stringify({ graph: graph }, null, "  "),
      );

      initialGraph = graph;
    } catch (error) {
      console.error(error);
    }

    if (options.watch) {
      options.reload = false;
      logger.info(
        colors.brightBlue(`Watcher`),
        `Process terminated! Restarting on file change...`,
      );
      watcher.addEventListener("change", async (event: any) => {
        logger.info(
          colors.brightBlue(`Watcher`),
          `File change detected! Restarting!`,
        );
        bundleFunction();
      }, { once: true });
      watcher.watch(Object.keys(options.initialGraph));
    }
  }

  await bundleFunction();
}

const program = new Program(
  { name: "bundler", description: "Bundler for deno" },
);

program
  .command({
    name: "bundle",
    description: "Bundle file to esm javsacript file",
    // help: false,
    fn: bundleCommand,
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
    description: `Set log level [possible values: ${logLevelNames.join(", ")}]`,
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

program
  .command({
    name: "help",
    description: "Prints this message or the help of the given subcommand(s)",
    fn(args: Args) {
      const { _ } = args;

      if (!_.length) {
        return program.help();
      }
      for (const cmd of _) {
        if (!program.commands[cmd]) {
          return console.error(
            invalidSubcommandError(
              cmd as string,
              Object.keys(program.commands),
            ),
          );
        }
      }
      const cmd = _[0];
      const command = program.commands[cmd];

      return command.help();
    },
  });

await program.parse(Deno.args);
