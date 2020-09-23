import type { FileMap, Graph } from "../graph.ts";
import type { ImportMap } from "../deps.ts";

export type PluginTest = (path: string) => boolean;
export type PluginFunction = (
  path: string,
  source: string,
  { graph, fileMap, importMap, outDir, depsDir }: {
    graph: Graph;
    fileMap: FileMap;
    importMap: ImportMap;
    outDir: string;
    depsDir: string;
  },
) => Promise<string> | string;

export class Plugin {
  test: PluginTest;
  fn: PluginFunction;
  constructor({ test, fn }: {
    test: PluginTest;
    fn: PluginFunction;
  }) {
    this.test = test;
    this.fn = fn;
  }
}
