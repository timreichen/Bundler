import { path, colors, fs, Sha256 } from "./deps.ts";
import { resolve as resolveCachePath, cache } from "./cache.ts";
import {
  resolveWithImportMap,
  ImportMap,
} from "./deps.ts";

const { join } = path;
const { green } = colors;
const { exists } = fs;

import {
  getDependencies,
  resolve as resolveDependencyPath,
} from "./dependencies.ts";
import { InputMap, OutputMap } from "./bundler.ts";

import { isURL } from "./_helpers.ts";

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
    const resolvedSpecifier = resolveCachePath(specifier);
    if (!resolvedSpecifier) {
      await cache(specifier, { reload });
    }
    specifier = resolveCachePath(specifier)!;
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
  entries: InputMap,
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
