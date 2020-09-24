import { path, fs, colors, ImportMap, Args } from "./deps.ts";
import { Sha256 } from "./deps.ts";

import { bundle } from "./bundler.ts";
import { Program, invalidSubcommandError } from "./deps.ts";

import { cssToModule } from "./plugins/transformers/css_to_module.ts";
import postcssPresetEnv from "https://jspm.dev/postcss-preset-env";

import { isURL } from "./_helpers.ts";
import { cssLoader } from "./plugins/loaders/css.ts";
import { typescriptLoader } from "./plugins/loaders/typescript.ts";
import { typescriptInjectSpecifiers } from "./plugins/transformers/typescript_inject_specifiers.ts";
import { terser } from "./plugins/transformers/terser.ts";
import type { CompilerOptions } from "./typescript.ts";
import type { FileMap, Graph } from "./graph.ts";

interface Meta {
  options: {
    fileMap: FileMap;
    options: {
      optimize: boolean;
    };
  };
  graph: Graph;
}

const postCSSPlugins = [
  (postcssPresetEnv as Function)({
    stage: 2,
    features: {
      "nesting-rules": true,
    },
  }),
];

const loaders = [
  typescriptLoader({
    test: (input: string) =>
      input.startsWith("http") || /\.(tsx?|jsx?)$/.test(input),
  }),
  cssLoader({
    use: postCSSPlugins,
  }),
];

async function runBundle(
  {
    _,
    "out-dir": outDir = "dist",
    importmap: importMapPath,
    config: configPath,
    optimize,
    reload,
    watch,
    // "log-level": logLevel,
    // quiet,
  }: {
      _: string[],
      "out-dir": string,
      importmap: string,
      config: string,
      optimize: boolean,
      reload:boolean,
      watch: boolean,
      // "log-level": number,
      // quiet: boolean,
  },
) {
  const importMap =
    (importMapPath
      ? JSON.parse(await Deno.readTextFile(importMapPath))
      : { imports: {}, scopes: {} }) as ImportMap;
  const compilerOptions =
    (configPath
      ? (JSON.parse(await Deno.readTextFile(configPath)) as {
        compilerOptions: CompilerOptions;
      })
        .compilerOptions
      : {}) as CompilerOptions;

  const depsDir = "deps";
  const cacheDir = ".cache";
  const graphFilePath = path.join(outDir, cacheDir, "meta.json");

  const transformers = [
    cssToModule({
      use: postCSSPlugins,
    }),
    typescriptInjectSpecifiers({
      test: (input: string) =>
        input.startsWith("http") || /\.(css|tsx?|jsx?)$/.test(input),
      compilerOptions: {
        target: "es2015",
        ...compilerOptions,
        module: "system",
      },
    }),
  ];

  const optimizers = [
    terser(),
  ];

  const hashes: { [file: string]: string } = {};

  async function main() {
    const inputMap: { [input: string]: string } = {};

    const time = performance.now();

    const fileMap: FileMap = {};

    for (const inp of _) {
      let [input, name] = inp.split("=");
      name = name ||
        path.basename(input || "").replace(/\.(css|tsx?|jsx?)$/, ".js");

      inputMap[input] = isURL(input)
        ? await fetch(input).then((data) => data.text())
        : await Deno.readTextFile(input);
      fileMap[input] = path.join(outDir, name);
    }

    const { graph: initialGraph }: Meta = ((await fs.exists(graphFilePath) &&
      JSON.parse(await Deno.readTextFile(graphFilePath))) ||
      { options: {}, graph: {} }) as Meta;

    const { outputMap, cacheMap, graph } = await bundle(
      inputMap,
      fileMap,
      {
        outDir,
        depsDir,
        cacheDir,
        importMap,
        graph: initialGraph,
        loaders,
        transformers,
        optimizers,
        reload,
        optimize,
      },
    );

    await fs.ensureFile(graphFilePath);
    await Deno.writeTextFile(
      graphFilePath,
      JSON.stringify(
        {
          options: {
            fileMap,
            optimize,
          },
          graph,
        },
        null,
        " ",
      ),
    );

    for (const [output, source] of Object.entries(cacheMap)) {
      await fs.ensureFile(output);
      await Deno.writeTextFile(output, source);
    }

    for (const [output, source] of Object.entries(outputMap)) {
      await fs.ensureFile(output);
      await Deno.writeTextFile(output, source);
    }

    console.log(colors.blue(`${Math.ceil(performance.now() - time)}ms`));

    const paths = Object.values(graph).map((entry) => entry.path);
    for (const path of paths) {
      if (!hashes[path]) {
        hashes[path] = new Sha256().update(await Deno.readFile(path)).hex();
      }
    }

    const watcher = Deno.watchFs(paths);

    if (watch) {
      console.log(colors.yellow(`Watch`), `${paths.length} files`);
      loop:
      for await (const { kind, paths } of watcher) {
        let needsUpdate = false;
        // checks if actual file content changed
        if (kind === "modify") {
          for (const path of paths) {
            const hash = new Sha256().update(await Deno.readFile(path)).hex();
            if (hashes[path] !== hash) {
              hashes[path] = hash;
              needsUpdate = true;
              break;
            }
          }
        } else {
          needsUpdate = true;
        }
        if (needsUpdate) {
          setTimeout(() => main(), 100);
          console.log(
            colors.blue(`Watcher`),
            `File change detected! Restarting!`,
          );
          break loop;
        }
      }
    }
  }

  main();
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
    name: "importmap",
    args: [{ name: "FILE" }],
    description: `UNSTABLE:
Load import map file
Docs: https://deno.land/manual/linking_to_external_code/import_maps
Specification: https://wicg.github.io/import-maps/
Examples: https://github.com/WICG/import-maps#the-import-map`,
  })
  // .option({
  //   name: "log-level",
  //   alias: "L",
  //   description: "Set log level [possible values: debug, info]",
  //   args: [{ name: "log-level" }],
  // })
  .option({
    name: "optimize",
    boolean: true,
    description: `Minify source code`,
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
      return console.log(
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
