import { Imports } from "../../dependency.ts";
import { postcss } from "../../deps.ts";
import { Data, Plugin, TestFunction } from "../plugin.ts";
import { Chunk } from "../../chunk.ts";
import { postcssExtractDependenciesPlugin } from "./postcss_plugins/extract_dependencies.ts";
import { stripCssUrlSpecifier } from "./_utils.ts";
import { resolve as resolveDependency } from "../../dependency.ts";
import { Asset } from "../../graph.ts";
import { resolve as resolveCache } from "../../cache.ts";

export class CssPlugin extends Plugin {
  use: postcss.AcceptedPlugin[];
  constructor(
    { test = (input: string) => input.endsWith(".css"), use = [] }: {
      test?: TestFunction;
      use?: postcss.AcceptedPlugin[];
    } = {},
  ) {
    super({ test });
    this.use = use;
  }
  async load(filePath: string) {
    return await Deno.readTextFile(filePath);
  }
  async createAsset(
    input: string,
    data: Data,
  ) {
    const filePath = input;
    const { bundler } = data;

    const imports: Imports = {};
    const use = [
      ...this.use,
      postcssExtractDependenciesPlugin({ imports })(
        input,
        { importMap: bundler.importMap },
      ),
    ];
    const source = await bundler.getSource(filePath, data);
    const processor = postcss.default(use);

    await processor.process(source as string);

    return {
      input,
      filePath,
      output: bundler.outputMap[input] ||
        bundler.createOutput(filePath, ".css"),
      imports,
      exports: {},
      type: "style",
    } as Asset;
  }
  async createChunk(
    inputHistory: string[],
    chunkList: string[][],
    data: Data,
  ) {
    const { bundler, graph } = data;
    const input = inputHistory[inputHistory.length - 1];
    const { imports, exports } = graph[input];
    const list = new Set([input]);
    Object.keys(imports).forEach((dependency) => list.add(dependency));
    Object.keys(exports).forEach((dependency) => list.add(dependency));

    const dependencies: Set<string> = new Set();

    for (const dependency of list) {
      if (dependency.endsWith(".css")) {
        dependencies.add(dependency);
      } else {
        chunkList.push([...inputHistory, dependency]);
      }
    }

    return new Chunk(bundler, {
      inputHistory,
      dependencies,
    });
  }
  async createBundle(
    chunk: Chunk,
    data: Data,
  ) {
    const { bundler, graph, reload } = data;
    const input = chunk.inputHistory[chunk.inputHistory.length - 1];
    let source = await chunk.getSource(input, data) as string;

    let bundleNeedsUpdate = false;

    for (const dependency of chunk.dependencies) {
      const resolvedFilePath = resolveCache(dependency);
      const needsUpdate = reload || !await chunk.hasCache(resolvedFilePath);
      if (needsUpdate) {
        bundleNeedsUpdate = true;
        source = chunk.sources[dependency] = await bundler.transformSource(
          dependency,
          input,
          chunk,
          data,
        ) as string;

        await chunk.setCache(
          resolvedFilePath,
          source,
        );
      } else {
        source = await chunk.getCache(input);
        chunk.sources[dependency] = source;
      }
    }
    if (!bundleNeedsUpdate) {
      return;
    }

    const regex = /@import (url\([^\)]+?\)|[^\)]+?)\;/g;
    let match;
    while (match = regex.exec(source)) {
      const matchValue = match[0];
      const url = stripCssUrlSpecifier(match[1]);
      const resolvedOutputFilePath = resolveDependency(
        input,
        url,
        bundler.importMap,
      );
      const dependencySource = await chunk.getSource(
        resolvedOutputFilePath,
        data,
      ) as string;

      source = source.replace(matchValue, dependencySource);
    }

    return source;
  }
}
