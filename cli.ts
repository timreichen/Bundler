import { readJsonSync } from "https://deno.land/std/fs/mod.ts";
import { basename } from "https://deno.land/std/path/mod.ts";
import autoprefixer from "https://jspm.dev/autoprefixer";
import { ImportMap } from "./import_map.ts";
import { Bundler } from "./mod.ts";
import { postcss } from "./plugins/postcss.ts";
import { text } from "./plugins/text.ts";
import { typescript } from "./plugins/typescript.ts";
import { Program } from "./program.ts";
import { CompilerOptions } from "./typescript.ts";

const program = new Program();

const bundleCommand = program.command(
  "bundle",
  "Bundle file to esm javsacript file",
)
  .argument({
    name: "file",
    // optional: true,
    multiple: true,
  })
  .flag({
    name: "config",
    value: {
      name: "FILE",
    },
    alias: "c",
    description: "Load tsconfig.json configuration file",
  })
  .flag({
    name: "name",
    value: {
      name: "FILE",
    },
    alias: "n",
    description: "name of out_file",
  })
  .flag({
    name: "dir",
    value: {
      name: "DIR",
    },
    alias: "d",
    description: "name of out_dir",
  })
  .flag({
    name: "help",
    alias: "h",
    description: "Prints help information",
  })
  .flag({
    name: "importmap",
    value: {
      name: "FILE",
    },
    description: `UNSTABLE:
Load import map file
Docs: https://deno.land/manual/linking_to_external_code/import_maps
Specification: https://wicg.github.io/import-maps/
Examples: https://github.com/WICG/import-maps#the-import-map`,
  })
  .flag({
    name: "reload",
    alias: "r",
    boolean: true,
    // value: {
    //   equalOnly: true,
    //   name: "FILE"
    // },
    description: `Reload source code (recompile TypeScript)
--reload
  Reload everything`,
  })
  .fn(
    async (
      { _, name, dir, importmap, config, reload }: {
        _: [string];
        name: string;
        dir: string;
        importmap: string;
        config: string;
        reload: boolean;
      },
    ) => {
      const importMap = importmap
        ? readJsonSync(importmap) as ImportMap
        : undefined;
      const compilerOptions = config
        ? (readJsonSync(config) as { compilerOptions: CompilerOptions })
          .compilerOptions
        : undefined;

      const input = _.shift();
      if (!input) return console.log(bundleCommand.help());
      name = name || basename(input).replace(/\.ts$/, ".js");

      // plugins.babel({ options: babelConfig }),

      const entry = {
        input,
        name,
        dir,
        plugins: [
          typescript({ options: { compilerOptions } }),
          postcss({ options: { use: [autoprefixer] } }),
          text({ include: (path: string) => /\.css$/.test(path) }),
        ],
      };

      const bundler = new Bundler();

      await bundler.bundle(entry, { compilerOptions, importMap, reload });
    },
  );

await program.parse(Deno.args);
