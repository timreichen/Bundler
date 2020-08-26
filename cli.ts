import { readJsonSync } from "https://deno.land/std/fs/mod.ts";
import { basename, join } from "https://deno.land/std/path/mod.ts";
import { ImportMap } from "https://deno.land/x/importmap@0.1.4/mod.ts";
import { bundle } from "./mod.ts";
// import { Program } from "https://deno.land/x/program@0.1.3/mod.ts"
import { Program } from "https://raw.githubusercontent.com/timreichen/program/master/mod.ts";
import { invalidSubcommandError } from "https://deno.land/x/program@0.1.3/_helpers.ts";
import { CompilerOptions } from "./typescript.ts";
import { terser } from "./plugins/terser.ts";
import { postcss } from "./plugins/postcss.ts";
import { csso } from "./plugins/csso.ts";
import postcssPresetEnv from "https://jspm.dev/postcss-preset-env";
// import postcssImportUrl from "https://jspm.dev/postcss-import-url";
// import atImport from "https://jspm.dev/postcss-import";

import { ensureFile } from "https://deno.land/std@0.63.0/fs/mod.ts";
import { text } from "./plugins/text.ts";
import { isURL } from "./_helpers.ts"

async function runBundle(
  {
    _,
    "out-dir": outDir = "dist",
    importmap: importMapPath,
    config: configPath,
    reload,
  }: {
    _: string[];
    "out-dir": string;
    importmap: string;
    config: string;
    reload: boolean;
  },
) {
  const importMap =
    (importMapPath
      ? readJsonSync(importMapPath)
      : { imports: {}, scopes: {} }) as ImportMap;
  const compilerOptions =
    (configPath
      ? (readJsonSync(configPath) as { compilerOptions: CompilerOptions })
        .compilerOptions
      : {}) as CompilerOptions;

  const entries: { [input: string]: string } = {};
  const outputMap: { [input: string]: string } = {};

  for (const inp of _) {
    let [input, name] = inp.split("=");
    name = name || basename(input || "").replace(/\.tsx?$/, ".js");

    entries[input] = isURL(input) ? await fetch(input).then(data => data.text()) : await Deno.readTextFile(input);
    outputMap[input] = join(outDir, name);
  }

  const depsDir = "deps";
  
  
  const plugins = [
    postcss({
      options: {
        use: [
          // (atImport as any)({
          //   // root: Deno.cwd()
          // }),
          // postcssImportUrl(),
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

  const modules = await bundle(
    entries,
    outputMap,
    { outDir, depsDir, compilerOptions, importMap, plugins, reload },
  );

  for (const [output, source] of Object.entries(modules)) {
    await ensureFile(output);
    await Deno.writeTextFile(output, source);
  }
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
    name: "name",
    args: [{ name: "FILE" }],
    alias: "n",
    description: "name of out_file",
  })
  .option({
    name: "dir",
    args: [{ name: "DIR" }],
    alias: "d",
    description: "name of out_dir",
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
  .option({
    name: "reload",
    alias: "r",
    boolean: true,
    description: `Reload source code (recompile TypeScript)`,
    //     description: `Reload source code (recompile TypeScript)
    // --reload
    //   Reload everything
    // --reload=https://deno.land/std
    //   Reload only standard modules
    // --reload=https://deno.land/std/fs/utils.ts,https://deno.land/std/fmt/colors.ts
    //   Reloads specific modules`,
  });

function help(args: any) {
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
    fn(args: any[]) {
      help(args);
    },
  });

await program.parse(Deno.args);
