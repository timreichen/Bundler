import { blue, green, yellow } from "https://deno.land/std/fmt/colors.ts";
import {
  ensureFile,
  exists,
  readJson,
  writeJson,
} from "https://deno.land/std/fs/mod.ts";
import { join, relative } from "https://deno.land/std/path/mod.ts";
import { v4 } from "https://deno.land/std/uuid/mod.ts";
import { resolveURLToCacheModulePath } from "./cache.ts";
import { Change, ChangeMap, ChangeType, createChangeMap } from "./changes.ts";
import { ts } from "./deps.ts";
import { fetchTextFile } from "./file.ts";
import { ImportMap } from "./import_map.ts";
import { Plugin } from "./plugin.ts";
import { CompilerOptions, transpile } from "./typescript.ts";
import { isURL } from "./_helpers.ts";

function getImportModuleNode(node: ts.node, source: string) {
  if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
    return node.moduleSpecifier;
  }
  // dynamic imports: create dep if fist argument is string literal: import("test.ts") -> "test.ts"
  if (
    ts.SyntaxKind[node.kind] === "CallExpression" &&
    ts.SyntaxKind[node.expression.kind] === "ImportKeyword"
  ) {
    const arg = node.arguments[0];
    if (!ts.isStringLiteral(arg)) {
      console.warn(
        yellow("Warning"),
        `dynamic import argument is not a string literal: Cannot resolve ${
          yellow(
            `import(${
              source.substring(
                arg.pos,
                node.arguments[node.arguments.length - 1].end,
              )
            })`,
          )
        } at index ${arg.pos}`,
      );
      return;
    }
    return arg;
  }
}
function getExportModuleNode(node: ts.node) {
  if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
    return node.moduleSpecifier;
  }
}

interface DependencyMapEntry {
  path: string;
  input: string;
  output: string;
  modified: number;
  dependencies: string[];
}
interface DependencyMap {
  [filePath: string]: DependencyMapEntry;
}

function injectDependenciesPlugin(
  changeMap: ChangeMap,
  outputPathMap: { [resolvedPath: string]: string },
  compilerOptions: CompilerOptions,
) {
  return async (input: string, output: string | undefined, depsDir: string) => {
    const data: string = await fetchTextFile(input);
    const moduleDeps = changeMap[input];
    const outputText = transpile(
      data,
      compilerOptions,
      (node: ts.Node) => {
        // console.log(ts.SyntaxKind[node.kind]);

        const moduleNode = getImportModuleNode(node, data) ||
          getExportModuleNode(node);
        // if is not a import or export statement
        if (!moduleNode) return node;

        // ignore type imports and exports (example: import type { MyInterface } from "./_interface.ts")
        if (node.importClause?.isTypeOnly || node.exportClause?.isTypeOnly) {
          return node;
        }

        const moduleNodePath = moduleNode.text;

        // get relative path to dist dir
        const resolvedPath = moduleDeps.dependencies[moduleNodePath];

        // either name of transpiled file or new uuid name

        let newPath = outputPathMap[resolvedPath] =
          outputPathMap[resolvedPath] || `${v4.generate()}.js`;

        // if is named file, its dir is dist dir, else is dist/deps
        newPath = join(output ? depsDir : ".", newPath);

        //append relative import string
        const newNode = ts.createStringLiteral(`./${newPath}`);
        // replace old with new node
        // FIX: why does ts.updateNode(newNode, mduleNode) not work?
        return ts.visitEachChild(
          node,
          (child: ts.Node) => child === moduleNode ? newNode : child,
        );
      },
    );

    return outputText;
  };
}

function changeDescription(changes: Change[]) {
  const c: { [type in ChangeType]: number } = changes.reduce(
    (object, { type }) => {
      if (!object[type]) object[type] = 0;
      object[type] += 1;
      return object;
    },
    {} as { [key in ChangeType]: number },
  );
  const array = Object.entries(c).reduce((array, [type, number]) => {
    array.push(blue(`${type}: ${number}`));
    return array;
  }, [] as string[]);
  return array.join(" | ");
}

export interface Entry {
  input: string;
  name: string;
  dir?: string;
  plugins: Plugin[];
}

const inject = (path: string) => /\.(tsx?|jsx?)$/.test(path);

export class Bundler {
  depsDir: string;
  depsMapName: string;
  constructor(
    { depsDir = "deps", depsMapName = "deps.json" }: {
      depsDir?: string;
      depsMapName?: string;
    } = {},
  ) {
    this.depsDir = depsDir;
    this.depsMapName = depsMapName;
  }
  async bundle(
    { input, name, dir = "dist", plugins }: Entry,
    { reload = false, importMap = { imports: {} }, compilerOptions = {} }: {
      reload?: boolean;
      importMap?: ImportMap;
      compilerOptions?: CompilerOptions;
    } = {},
  ) {
    const start = performance.now();

    // example: dist/deps
    const depsDirPath = join(dir, this.depsDir);
    // create output path relative to depsDirPath. Example: dist/a.js -> ../a.js
    const output = relative(depsDirPath, join(dir, name));

    const mapFilePath = join(depsDirPath, this.depsMapName);
    const dependencyMap =
      (await exists(mapFilePath) && await readJson(mapFilePath) ||
        {}) as DependencyMap;

    const { changeMap, outputPathMap } = await createChangeMap(
      input,
      output,
      dependencyMap,
      { dir, depsDir: this.depsDir, reload, importMap },
    );

    const changes = Object.values(changeMap);

    if (changes.length) {
      const injectDependencies = injectDependenciesPlugin(
        changeMap,
        outputPathMap,
        compilerOptions,
      );

      for (const change of changes) {
        const { input, resolvedInput, output, dependencies } = change;

        let source: string = "";

        if (isURL(resolvedInput) || inject(resolvedInput)) {
          // injects dependency paths into ts or js file
          source = await injectDependencies(
            resolvedInput,
            output,
            this.depsDir,
          );
        } else {
          // if is other file read source
          source = Deno.readTextFileSync(resolvedInput);
        }

        for (const plugin of plugins) {
          source = await plugin(resolvedInput, source);
        }

        // if named file dir name is dist, if not is dist/deps
        const outputFilePath = output
          ? join(depsDirPath, output)
          : join(depsDirPath, outputPathMap[input]);

        // get local file path for url imports
        const fileInputPath = resolveURLToCacheModulePath(input) ||
          resolvedInput;

        await ensureFile(outputFilePath);
        await Deno.writeTextFile(outputFilePath, source);
        // get mtime as a number (JSON doesn't store dates)
        const modified = Deno.statSync(outputFilePath).mtime!.getTime();

        // new dependencyMap entry
        dependencyMap[input] = {
          path: input,
          input: fileInputPath,
          output: output ? output : relative(depsDirPath, outputFilePath),
          modified,
          dependencies: Object.values(dependencies),
        };
      }

      console.log(changeDescription(changes));
      console.log(green(`Update`), mapFilePath);
      await writeJson(mapFilePath, dependencyMap, { spaces: "  " });
    } else {
      console.log(green(`up-to-date`));
    }

    console.log(blue(`${Math.ceil(performance.now() - start)}ms`));

    return dependencyMap;
  }
}
