// deno-lint-ignore-file require-await
import { cache, resolve as resolveCache } from "../../cache/cache.ts";
import { path, Sha256, ts } from "../../deps.ts";
import { getAsset } from "../../graph.ts";
import { isURL, readTextFile } from "../../_util.ts";
import {
  Context,
  DependencyType,
  Format,
  getFormat,
  Item,
  Plugin,
} from "../plugin.ts";
import { extractDependenciesFromSourceFile } from "./dependencies/extract_dependencies.ts";
import { resolveDependencies } from "./dependencies/_util.ts";

export class TypescriptPlugin extends Plugin {
  compilerOptions: Deno.CompilerOptions;
  constructor(
    { compilerOptions = {} }: { compilerOptions?: Deno.CompilerOptions } = {},
  ) {
    super();
    this.compilerOptions = compilerOptions;
  }
  async test(item: Item, _context: Context) {
    const input = item.history[0];
    return /\.(t|j)sx?$/.test(input) ||
      (isURL(input) &&
        !/([\.][a-zA-Z]\w*)$/.test(
          input,
        )); /* handle url without extension as script files */
  }
  async readSource(input: string) {
    let filePath = input;

    if (isURL(filePath)) {
      await cache(filePath);
      filePath = resolveCache(filePath);
    }

    const source = await readTextFile(filePath);
    const sourceFile = ts.createSourceFile(
      input,
      source,
      ts.ScriptTarget.ESNext,
    );
    return sourceFile;
  }
  async createAsset(
    item: Item,
    context: Context,
  ) {
    const { history, type } = item;
    const input = history[0];

    const { bundler, outputMap, depsDirPath, importMap } = context;

    const sourceFile = await bundler.readSource(item, context) as ts.SourceFile;

    const dependencies = extractDependenciesFromSourceFile(sourceFile);

    const resolvedModuleData = resolveDependencies(
      input,
      dependencies,
      { importMap },
    );

    const extension = ".js";
    return {
      input,
      output: outputMap[input] || path.join(
        depsDirPath,
        `${new Sha256().update(input).hex()}${extension}`,
      ),
      dependencies: resolvedModuleData.dependencies,
      export: resolvedModuleData.export,
      type,
    };
  }
  createChunk(
    item: Item,
    context: Context,
    chunkList: Item[],
  ) {
    const { graph } = context;
    const dependencyItems: Item[] = [];
    const { history, type } = item;
    const input = history[0];

    const asset = getAsset(graph, input, type);
    Object.entries(asset.dependencies).forEach(([dependency, dependencies]) => {
      Object.keys(dependencies).forEach((type) => {
        const newItem: Item = {
          history: [dependency, ...history],
          type: type as DependencyType,
        };

        const format = getFormat(dependency);

        switch (format) {
          case Format.Script: {
            switch (type) {
              case DependencyType.Import:
                break;
              case DependencyType.Fetch:
              case DependencyType.DynamicImport:
              case DependencyType.ServiceWorker:
              case DependencyType.WebWorker:
                chunkList.push(newItem);
                break;
              default: {
                throw Error(`dependency type not supported: ${type}`);
              }
            }
            break;
          }
          case Format.Json: {
            switch (type) {
              case DependencyType.Import: {
                break;
              }
              case DependencyType.Fetch:
              case DependencyType.DynamicImport: {
                chunkList.push(newItem);
                break;
              }
              default: {
                throw Error(`dependency type not supported: ${type}`);
              }
            }
            break;
          }
          case Format.Style: {
            switch (type) {
              case DependencyType.Import: {
                break;
              }
              case DependencyType.Fetch:
              case DependencyType.DynamicImport: {
                chunkList.push(newItem);
                break;
              }
              default: {
                throw Error(`dependency type not supported: ${type}`);
              }
            }
            break;
          }
          default: {
            chunkList.push(newItem);
            break;
          }
        }

        dependencyItems.push(newItem);
      });
    });
    return {
      item,
      dependencyItems,
    };
  }
}
