import { readJsonSync } from "https://deno.land/std/fs/mod.ts";
import { basename } from "https://deno.land/std/path/mod.ts";
import autoprefixer from "https://jspm.dev/autoprefixer";
import { ImportMap } from "./import_map.ts";
import { Bundler } from "./mod.ts";
import { Program } from "https://raw.githubusercontent.com/timreichen/program/master/mod.ts";
import { CompilerOptions } from "./typescript.ts";
import { postcss } from "./plugins/postcss.ts";
import { text } from "./plugins/text.ts";
import { babel } from "./plugins/babel.ts";
// import { typescript } from "./plugins/typescript.ts";

import babelPresetEnv from "https://dev.jspm.io/@babel/preset-env";
import babelPluginSyntaxTopLevelAwait from "https://dev.jspm.io/@babel/plugin-syntax-top-level-await";
import babelPluginProposalClassProperties from "https://dev.jspm.io/@babel/plugin-proposal-class-properties";
import babelPluginTypescript from "https://dev.jspm.io/@babel/plugin-transform-typescript";
import babelProposalDecoratos from "https://dev.jspm.io/@babel/plugin-proposal-decorators";
import babelPluginTransformModulesSystemjs from "https://dev.jspm.io/@babel/plugin-transform-modules-systemjs";

async function runBundle(
  { _, name, dir, importmap, config, reload }: {
    _: [string];
    name: string;
    dir: string;
    importmap: string;
    config: string;
    reload: boolean;
  },
) {
  const importMap = importmap
    ? readJsonSync(importmap) as ImportMap
    : undefined;
  const compilerOptions = config
    ? (readJsonSync(config) as { compilerOptions: CompilerOptions })
      .compilerOptions
    : undefined;

  const input = _.shift()!;
  name = name || basename(input || "").replace(/\.ts$/, ".js");

  const defaultPresets = [
    [babelPresetEnv, {
      targets: {
        browsers: "chrome >= 59",
      },
      modules: "systemjs",
    }],
  ];

  const defaultPlugins = [
    [babelProposalDecoratos, { legacy: true }],
    babelPluginSyntaxTopLevelAwait,
    babelPluginProposalClassProperties,
    // babelPluginTransformModulesSystemjs
    // babelPluginTypescript,
  ];

  const entry = {
    input,
    name,
    dir,
    plugins: [
      babel({
        options: {
          presets: defaultPresets,
          plugins: defaultPlugins,
        },
      } as any),
      // typescript({ options: { compilerOptions } }),
      postcss({ options: { use: [autoprefixer] } }),
      text({ include: (path: string) => /\.css$/.test(path) }),
    ],
  };

  const bundler = new Bundler();

  await bundler.bundle(entry, { compilerOptions, importMap, reload });
}

const program = new Program(
  { name: "bundler", description: "Bundler for deno" },
);

program
  .command({
    name: "bundle",
    description: "Bundle file to esm javsacript file",
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
    description: `Reload source code (recompile TypeScript)
--reload
  Reload everything`,
  });

await program.parse(Deno.args);
