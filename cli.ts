#!/usr/bin/env -S deno run --unstable --allow-net --allow-read --allow-write

import { Args, colors, fs } from "./deps.ts";
import { invalidSubcommandError, Program } from "./deps.ts";
import { Logger } from "./logger.ts";
import { createOptions, logLevelNames } from "./_util.ts";
import { Watcher } from "./watcher.ts";
import { Bundler } from "./bundler.ts";
import { defaultPlugins } from "./_bundler_utils.ts";

async function bundleCommand(
  args: Args,
) {
  const options = await createOptions(args);
  const logger = new Logger({
    logLevel: options.logLevel,
    quiet: options.quiet,
  });

  const bundler = new Bundler(
    defaultPlugins({
      typescriptCompilerOptions: {
        // custom compiler options
        ...options.compilerOptions,
      },
    }),
    { logger },
  );
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
      await watcher.watch(Object.keys(options.initialGraph));
      logger.info(
        colors.brightBlue(`Watcher`),
        `File change detected! Restarting!`,
      );
      await bundleFunction();
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
    description: `Bundle file(s)`,
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
    description: `--import-map <FILE>            
    Load import map file from local file or remote URL.
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
    description: `Reload source code
    --reload
      Reload everything
    --reload=src/index.html
      Reload only individual files`,
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
