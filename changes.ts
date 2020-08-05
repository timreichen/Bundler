import {
  resolve as resolveDependencyPath,
  getDependencyMap,
  Dependency,
} from "./dependencies.ts";
import { green, yellow } from "https://deno.land/std/fmt/colors.ts";
import { exists } from "https://deno.land/std/fs/mod.ts";
import { join, extname, isAbsolute } from "https://deno.land/std/path/mod.ts";
import { ImportMap } from "./import_map.ts";
import { ensureExtension } from "./_helpers.ts";

// exclude all url imports with js extension. Browser will load them on their own
// const exclude = (path: string) => {
//   return /^http?s:.+\.js$/.test(path)
// };

export type ChangeType = "Create" | "Update" | "Move" | "Delete";

// a file description that needs to be transpiled
export interface Change {
  path: string;
  // input is same as path but with ensured extension
  input: string;
  output?: string;
  type: ChangeType;
  dependencies: { [path: string]: Dependency };
}

// is a map of multiple changes
export interface ChangeMap {
  [path: string]: Change;
}

export interface DependencyMap {
  [filePath: string]: {
    path: string;
    input: string;
    output: string;
    modified: number;
    dependencies: string[];
  };
}

async function createChange(
  path: string,
  output: string | undefined,
  type: ChangeType,
  importMap: ImportMap,
): Promise<Change> {
  let resolvedInput = path;

  const dependencyMap = await getDependencyMap(resolvedInput);
  const dependencies = dependencyMap.reduce(
    (object, { path, dynamic }) => {
      object[path] = {
        path: resolveDependencyPath(resolvedInput, path, importMap),
        dynamic,
      };

      return object;
    },
    {} as { [key: string]: Dependency },
  );

  return { path: path, input: resolvedInput, output, type, dependencies };
}

/**
 * creates map of changed files
 */
export async function createChangeMap(
  path: string,
  output: string | undefined,
  dependencyMap: DependencyMap,
  { dir, depsDir, reload = false, importMap = { imports: {} } }: {
    dir: string;
    depsDir: string;
    reload?: boolean;
    importMap: ImportMap;
  },
): Promise<ChangeMap> {
  const outputDir = join(dir, depsDir);

  const changeMap: ChangeMap = {};
  const checkedPaths: Set<string> = new Set();

  const queue: { path: string; output: string | undefined }[] = [
    { path, output },
  ];

  async function updateDependentFiles(input: string) {
    for (const dependency of Object.values(dependencyMap)) {
      if (dependency.dependencies.includes(input)) {
        const change = await createChange(
          dependency.path,
          dependency.output,
          "Update",
          importMap,
        );
        changeMap[change.input] = change;
      }
    }
  }

  // check if input file and deps exist and are up to date. If not create changes for each
  async function check(path: string, output: string | undefined) {
    if (checkedPaths.has(path)) return;

    checkedPaths.add(path);
    const file = dependencyMap[path];
    if (!file) {
      const change = await createChange(path, output, "Create", importMap);
      changeMap[change.input] = change;
      for (const dependency of Object.values(change.dependencies)) {
        queue.push({ path: dependency.path, output: undefined });
      }
      return;
    }

    const outputPath = join(outputDir, file.output);

    const inputFileExists = await exists(file.input);

    const outputFileExists = await exists(outputPath);

    if (!inputFileExists) {
      console.log(yellow(`Error`), `file '${file.input}' not found`);
      return;
    }

    const fileModified = inputFileExists &&
      (await Deno.stat(file.input)).mtime!.getTime() > file.modified;
    const changed = inputFileExists && outputFileExists ? fileModified : true;

    if (!outputFileExists) {
      const change = await createChange(path, output, "Create", importMap);
      changeMap[change.input] = change;
      await updateDependentFiles(path);
    } else if (output && file.output !== output) {
      await Deno.remove(outputPath);
      const change = await createChange(path, output, "Move", importMap);
      changeMap[change.input] = change;
      await updateDependentFiles(path);
    } else if (changed) {
      const change = await createChange(path, output, "Update", importMap);
      changeMap[change.input] = change;
    } else {
      if (reload) {
        if (outputFileExists) {
          // console.log(yellow(`Delete`), outputPath)
          await Deno.remove(outputPath);
        }
        const change = await createChange(path, output, "Create", importMap);
        changeMap[change.input] = change;
      } else {
        console.log(green(`Check`), path);
      }
    }

    queue.push(...file.dependencies.map((dependency) => ({
      path: dependency,
      output: undefined,
    })));
  }

  // loop through input file and deps
  while (queue.length) {
    const { path: input, output } = queue.pop()!;
    // if (exclude(input)) {
    //   outputMap[input] = input;
    //   continue;
    // }

    await check(input, output);
  }

  return changeMap;
}
