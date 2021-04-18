import { Dependencies, DependencyType, Format } from "./plugins/plugin.ts";

export interface Asset {
  filePath: string;
  output: string;
  dependencies: Dependencies;
  format: Format | null;
}

export type GraphEntry = {
  [key in DependencyType]?: Asset;
};

export type Graph = Record<string, GraphEntry>;

export function getAsset(graph: Graph, input: string, type: DependencyType) {
  const asset = graph[input]?.[type];
  if (!asset) {
    throw new Error(
      `asset does not exist in graph: ${input} ${type}`,
    );
  }
  return asset;
}
