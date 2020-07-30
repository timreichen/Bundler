import { parse } from "https://deno.land/std/flags/mod.ts";
import { readJsonSync } from "https://deno.land/std/fs/mod.ts";
import { basename } from "https://deno.land/std/path/mod.ts";
import { Bundler } from "./mod.ts";
import { ImportMap } from "./import_map.ts";

import { typescript } from "./plugins/typescript.ts";
import { postcss } from "./plugins/postcss.ts";
import { text } from "./plugins/text.ts";
import { CompilerOptions } from "./typescript.ts";

// import babelPresetEnv from "https://dev.jspm.io/@babel/preset-env"
// import babelPluginSyntaxTopLevelAwait from "https://dev.jspm.io/@babel/plugin-syntax-top-level-await"
// import babelPluginTransformTypescript from "https://dev.jspm.io/@babel/plugin-transform-typescript"
// import babelProposalDecoratos from "https://dev.jspm.io/@babel/plugin-proposal-decorators"
// import babelPluginProposalClassProperties from "https://dev.jspm.io/@babel/plugin-proposal-class-properties"
import autoprefixer from "https://jspm.dev/autoprefixer";

function createOption(
  { alias, name, append = "", description = "" }: {
    alias?: string;
    name: string;
    append?: string;
    description?: string;
  },
) {
  const aliasName = alias ? `-${alias}, ` : " ".repeat(4);
  const longName = `--${name}`;
  const indent = "\t";
  return `${indent}${aliasName}${longName} ${append || ""}\n${
    description.split("\n").map((line: string) => `${indent.repeat(2)}${line}`)
      .join(`\n`)
  }`;
}

const configOption = createOption(
  {
    name: "config",
    alias: "c",
    description: "Load config.json configuration file",
  },
);
const helpOption = createOption(
  { name: "help", description: "Prints help information" },
);
const importmapOption = createOption(
  {
    name: "importmap",
    append: "<FILE>",
    description:
      "UNSTABLE:\nLoad import map file\nDocs: https://deno.land/manual/linking_to_external_code/import_maps\nSpecification: https://wicg.github.io/import-maps/\nExamples: https://github.com/WICG/import-maps#the-import-map",
  },
);
const nameOption = createOption(
  { name: "name", alias: "n", description: "name of output file" },
);
const dirOption = createOption(
  { name: "dir", append: "<DIR>", description: "Output directory" },
);
const reloadOption = createOption(
  {
    name: "reload",
    alias: "r",
    description:
      "Reload source code (recompile all files)\n--reload Reload everything",
  },
);

async function runBundle(
  { input, name, dir, importmap, config, reload }: {
    input: string;
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
}

function runHelp() {
  const name = "bundler";
  console.log("USAGE:");
  console.log(
    `\t${name} bundle bundle --dir dist --importmap=importmap.json --config tsconfig.json src/index.ts --name index.js`,
  );
  console.log("\n");
  console.log("OPTIONS:");
  console.log(configOption);
  console.log(dirOption);
  console.log(helpOption);
  console.log(importmapOption);
  console.log(nameOption);
  console.log(reloadOption);
}

async function main() {
  const args = parse(Deno.args, {
    alias: {
      config: "c",
      name: "n",
      reload: "r",
    },
    boolean: ["reload"],
  });
  const { _ } = args;
  const [cmd] = _;

  switch (cmd) {
    case "bundle": {
      const { importmap, config, dir, reload, name } = args;
      const input = _[1] as string;
      await runBundle({ input, name, dir, importmap, config, reload });
      break;
    }
    default:
    case "help": {
      runHelp();
      break;
    }
  }
}

await main();
