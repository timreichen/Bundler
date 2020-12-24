import {
  Dependencies,
  getDependenciesTypescriptTransformer,
  resolve as resolveDependency,
} from "../../dependency.ts";
import { ImportMap, ts } from "../../deps.ts";
import { Data, Plugin, TestFunction } from "../plugin.ts";
import { cache, resolve as resolveCache } from "../../cache.ts";
import { Asset } from "../../graph.ts";
import { Chunk } from "../../chunk.ts";

function resolveDependencies(
  filePath: string,
  { imports, exports }: Dependencies,
  { importMap = { imports: {} } }: { importMap: ImportMap },
) {
  const dependencies: Dependencies = {
    imports: {},
    exports: {},
  };

  Object.keys(imports).forEach((dependencyPath) => {
    const resolvedDependencyPath = resolveDependency(
      filePath,
      dependencyPath,
      importMap,
    );
    dependencies.imports[resolvedDependencyPath] = imports[dependencyPath];
  });
  Object.keys(exports).forEach((dependencyPath) => {
    const resolvedDependencyPath = resolveDependency(
      filePath,
      dependencyPath,
      importMap,
    );
    dependencies.exports[resolvedDependencyPath] = exports[dependencyPath];
  });

  return dependencies;
}
export class TypescriptPlugin extends Plugin {
  constructor(
    { test = (input: string) => /\.(t|j)sx?$/.test(input) }: {
      test?: TestFunction;
    } = {},
  ) {
    super({ test });
  }
  async load(input: string, { importMap }: any) {
    await cache(input, { importMap });
    const filePath = resolveCache(input);
    return await Deno.readTextFile(filePath);
  }
  async createAsset(
    input: string,
    data: Data,
  ) {
    const { bundler } = data;
    const filePath = resolveCache(input);
    const compilerOptions = {};
    const dependencies = {
      imports: {},
      exports: {},
    };

    const source = await bundler.getSource(input, data);

    const sourceFile = ts.createSourceFile(
      input,
      source as string,
      ts.ScriptTarget.Latest,
    );

    ts.transform(
      sourceFile,
      [getDependenciesTypescriptTransformer(dependencies)],
      compilerOptions,
    );

    const { imports, exports } = resolveDependencies(
      input,
      dependencies,
      { importMap: bundler.importMap },
    );

    return {
      input,
      filePath,
      output: bundler.outputMap[input] || bundler.createOutput(filePath, ".js"),
      imports,
      exports,
      type: "script",
    } as Asset;
  }
  async createChunk(
    inputHistory: string[],
    chunkList: string[][],
    data: Data,
  ) {
    const { bundler, graph } = data;
    const input = inputHistory[inputHistory.length - 1];
    const list = new Set([input]);
    const dependencies: Set<string> = new Set();
    for (const input of list) {
      const { imports, exports } = graph[input];
      Object.entries(imports).forEach(([dependency, { dynamic }]) => {
        if (dynamic) {
          chunkList.push([...inputHistory, dependency]);
        } else {
          dependencies.add(dependency);
        }
      });
      Object.keys(exports).forEach((dependency) =>
        dependencies.add(dependency)
      );
    }
    return new Chunk(bundler, {
      inputHistory,
      dependencies,
    });
  }
}
