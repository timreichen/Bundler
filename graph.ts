import { Dependencies, DependencyType, Export } from "./plugins/plugin.ts";

export interface Asset {
  input: string;
  output: string;
  type: DependencyType;
  dependencies: Dependencies;
  export: Export;
  importSpecifier?: string;
}

export type Graph = Record<string, Asset[]>;

export function getAsset(graph: Graph, input: string, type: DependencyType) {
  const entry = graph[input];
  if (!entry) {
    throw Error(`asset entry not found: ${input}`);
  }

  const asset = entry.find((asset) => asset.type === type);
  if (!asset) {
    throw Error(`asset type found: ${input} ${type}`);
  }
  return asset;
}
