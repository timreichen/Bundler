import { getAsset, Graph } from "../../graph.ts";
import { DependencyType, Item } from "../plugin.ts";

export function topologicalSort(items: Item[], graph: Graph) {
  const result: Item[] = [];
  const sorted: Set<string> = new Set();
  const itemInputs = items.map((item) => item.history[0]);

  function sort(
    item: Item,
  ) {
    const { history } = item;
    const input = history[0];
    if (sorted.has(input)) return;
    sorted.add(item.history[0]);

    const asset = getAsset(graph, input, item.type);
    const dependencies: [string, unknown][] = Object.entries(asset.dependencies)
      .filter(
        ([dependency]) => itemInputs.includes(dependency),
      );
    dependencies.forEach(([dependency, types]) => {
      if (
        !sorted.has(dependency)
      ) {
        Object.keys(types as string[]).forEach((type) => {
          const newDependencyItem: Item = {
            history: [dependency, ...item.history],
            type: type as DependencyType,
          };
          sort(newDependencyItem);
        });
      }
    });
    result.push(item);
  }

  items.forEach(sort);

  return result;
}
