import { getAsset, Graph } from "../../graph.ts";
import { Dependency, Item } from "../plugin.ts";

export function topologicalSort(items: Item[], graph: Graph) {
  const result: Item[] = [];
  const sorted: Set<string> = new Set();
  const itemInputs = items.map((item) => item.history[0]);

  function sort(
    item: Item,
  ) {
    const input = item.history[0];
    if (sorted.has(input)) return;
    sorted.add(input);

    const asset = getAsset(graph, input, item.type);
    const dependencies: [string, Dependency][] = [
      ...Object.entries(asset.dependencies.imports),
      ...Object.entries(asset.dependencies.exports),
    ].filter(([dependency]) => itemInputs.includes(dependency));

    for (const [dependency, dependencyItem] of dependencies) {
      if (
        !sorted.has(dependency)
      ) {
        const newDependencyItem: Item = {
          history: [dependency, ...item.history],
          type: dependencyItem.type,
          format: dependencyItem.format,
        };
        sort(newDependencyItem);
      }
    }
    result.push(item);
  }

  for (const item of items) {
    sort(item);
  }
  return result;
}
