import { join } from "https://deno.land/std@0.65.0/path/mod.ts";
import { Sha256 } from "https://deno.land/std@0.65.0/hash/sha256.ts";
import { green } from "https://deno.land/std@0.65.0/fmt/colors.ts";
import { exists } from "https://deno.land/std@0.63.0/fs/mod.ts";
import { resolve as resolveCachePath } from "./cache.ts";
import {
  getDependencies,
  resolve as resolveDependencyPath,
} from "./dependencies.ts";
import { EntryMap, OutputMap } from "./bundler.ts";
import {
  resolve as resolveWithImportMap,
  ImportMap,
} from "https://deno.land/x/importmap@0.1.4/mod.ts";
import { isURL } from "./_helpers.ts";
import { resolve as resolveURLToCacheModulePath, cache } from "./cache.ts";

export enum ChangeType {
  Create,
  Change,
  Move,
  Delete,
}
export interface Change {
  type: ChangeType;
  specifier: string;
  input: string;
  output: string;
  source: string;
  dependencies: string[];
}

async function fetchTextFile(specifier: string, reload = false) {
  const isUrlImport = isURL(specifier);
  if (isUrlImport) {
    const resolvedSpecifier = resolveURLToCacheModulePath(specifier);
    if (!resolvedSpecifier) {
      await cache(specifier, reload);
    }
    specifier = resolveURLToCacheModulePath(specifier)!;
  }
  return await Deno.readTextFile(specifier);
}

export function changeTypeName(changeType: ChangeType) {
  switch (changeType) {
    case ChangeType.Create:
      return "Create";
    case ChangeType.Change:
      return "Change";
    case ChangeType.Move:
      return "Move";
    case ChangeType.Delete:
      return "Delete";
  }
}

export async function createChangeMap(
  entries: EntryMap,
  outputMap: OutputMap,
  { dir, importMap, reload }: {
    dir: string;
    importMap: ImportMap;
    reload: boolean;
  },
) {
  const changes: { [input: string]: Change } = {};

  for (const input of Object.keys(entries)) {
    const checkedInputs: Set<string> = new Set();
    const queue = [input];
    while (queue.length) {
      const specifier = queue.pop()!;
      if (checkedInputs.has(specifier)) continue;
      checkedInputs.add(specifier);
      // check if input exists
      const resolvedSpecifier = resolveWithImportMap(specifier, importMap);
      const input = resolveCachePath(resolvedSpecifier) || resolvedSpecifier;

      if (!isURL(input) && !await exists(input)) {
        throw Error(`file '${specifier}' does not exist`);
      }

      // console.table({
      //   specifier,
      //   input,
      //   resolvedSpecifier,
      // })

      const output = outputMap[resolvedSpecifier] =
        outputMap[resolvedSpecifier] ||
        `${join(dir, new Sha256().update(input).hex())}.js`;

      const source = entries[input] || await fetchTextFile(input);

      const dependencies = await getDependencies(source);
      queue.push(
        ...dependencies.map((dependency) =>
          resolveDependencyPath(specifier, dependency, importMap)
        ),
      );

      if (!output || !await exists(output)) {
        changes[input] = {
          type: ChangeType.Create,
          specifier: specifier,
          input,
          output,
          source,
          dependencies,
        };
      } else if (output && output !== output) {
        changes[input] = {
          type: ChangeType.Move,
          specifier: specifier,
          input,
          output,
          source,
          dependencies,
        };
      } else if (
        reload ||
        (await Deno.stat(input)).mtime!.getTime() >=
          (await Deno.stat(output)).mtime!.getTime()
      ) {
        // check if output changed
        changes[input] = {
          type: ChangeType.Change,
          specifier: specifier,
          input,
          output,
          source,
          dependencies,
        };
      } else {
        console.log(green(`Check`), specifier);
      }
    }
  }

  return changes;
}
