import { path, fs, colors } from "./deps.ts";
import { Md5 } from "https://deno.land/std/hash/md5.ts";

import { ImportMap } from "./deps.ts";
import { bundle } from "./mod.ts";
import { Program, invalidSubcommandError } from "./deps.ts";
import { CompilerOptions } from "./typescript.ts";

import { postcss } from "./plugins/transformers/postcss.ts";
import { csso } from "./plugins/optimizers/csso.ts";
import postcssPresetEnv from "https://jspm.dev/postcss-preset-env";
import { terser } from "./plugins/optimizers/terser.ts";

import { text } from "./plugins/transformers/text.ts";
import { isURL } from "./_helpers.ts";
import { Graph } from "./bundler.ts";

const { basename, join } = path;
const { readJsonSync, ensureFile } = fs;

interface Meta {
  graph: Graph;
}

async function runBundle(
  options: {
    _: string[];
    "out-dir": string;
    importmap: string;
    config: string;
    optimize: boolean;
    reload: boolean;
    watch: boolean;
  },
) {
  const {
    _,
    "out-dir": outDir = "dist",
    importmap: importMapPath,
    config: configPath,
    optimize,
    reload,
    watch,
  } = options;

  const importMap =
    (importMapPath
      ? readJsonSync(importMapPath)
      : { imports: {}, scopes: {} }) as ImportMap;
  const compilerOptions =
    (configPath
      ? (readJsonSync(configPath) as { compilerOptions: CompilerOptions })
        .compilerOptions
      : {}) as CompilerOptions;

  const inputMap: { [input: string]: string } = {};
  const outputMap: { [input: string]: string } = {};

  const depsDir = "deps";
  const cacheDir = ".cache";
  const graphFilePath = path.join(outDir, cacheDir, "meta.json");
  const meta: Meta =
    ((await fs.exists(graphFilePath) && await fs.readJson(graphFilePath)) ||
      { options: {}, graph: {} }) as Meta;

  const { graph: initialGraph } = meta;

  const transformers = [
    postcss({
      options: {
        use: [
          (postcssPresetEnv as Function)({
            stage: 2,
            features: {
              "nesting-rules": true,
            },
          }),
        ],
      },
    }),
    csso(),
    text({ include: (path: string) => /\.css$/.test(path) }),
  ];
  const optimizers = [
    terser(),
  ];

  const hashes: { [file: string]: string } = {};

  async function main() {
    for (const inp of _) {
      let [input, name] = inp.split("=");
      name = name || basename(input || "").replace(/\.tsx?$/, ".js");

      inputMap[input] = isURL(input)
        ? await fetch(input).then((data) => data.text())
        : await Deno.readTextFile(input);
      outputMap[input] = join(outDir, name);
    }

    const { modules, graph } = await bundle(
      inputMap,
      outputMap,
      {
        outDir,
        depsDir,
        cacheDir,
        compilerOptions,
        importMap,
        graph: initialGraph,
        transformers,
        optimizers,
        reload,
        optimize,
      },
    );

    await fs.ensureFile(graphFilePath);
    await fs.writeJson(graphFilePath, { options, graph }, { spaces: " " });

    for (const [output, source] of Object.entries(modules)) {
      await ensureFile(output);
      await Deno.writeTextFile(output, source);
    }

    const paths = Object.values(graph).map((entry) => entry.input);
    for (const path of paths) {
      if (!hashes[path]) {
        hashes[path] = new Md5().update(await Deno.readFile(path)).toString();
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
            const hash = new Md5().update(await Deno.readFile(path)).toString();
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
          console.log(colors.yellow(`Change`), paths.join(", "));
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
    name: "dir",
    args: [{ name: "DIR" }],
    alias: "d",
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
    alias: "o",
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
    alias: "w",
    boolean: true,
    description: `Watch files and re-bundle on change`,
  });

function help(args: { [key: string]: any }) {
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
    fn(args: unknown[]) {
      help(args);
    },
  });

await program.parse(Deno.args);
