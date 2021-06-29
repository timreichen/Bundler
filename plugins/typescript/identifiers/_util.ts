import { getAsset, Graph } from "../../../graph.ts";
import { Item } from "../../plugin.ts";

export type IdentifierMap = Map<string, string>;

export const defaultKeyword = "default";

export function getIdentifier(
  identifierMap: IdentifierMap,
  input: string,
): string {
  if (!identifierMap.has(input)) {
    throw Error(
      `identifier not found: ${input}`,
    );
  }
  return identifierMap.get(input)!;
}

const regex = /^(?<name>[A-Z_$][A-Z0-9α-ω_$]*?)(?<number>\d*)$/i;
function createIdentifier(
  identifier: string,
  blacklistIdentifiers: Set<string>,
) {
  const match = regex.exec(identifier);

  const { name, number } = match!.groups!;
  let newIdentifier = identifier;
  let index: number = Number(number) || 1;
  while (blacklistIdentifiers.has(newIdentifier)) {
    newIdentifier = `${name}${index}`;
    index += 1;
  }
  return newIdentifier;
}

export function createIdentifierMap(
  identifiers: Set<string>,
  blacklistIdentifiers: Set<string>,
  identifierMap: IdentifierMap = new Map(),
) {
  identifiers.forEach((identifier) => {
    let newIdentifier = identifier;
    if (blacklistIdentifiers.has(newIdentifier)) {
      newIdentifier = createIdentifier(
        identifier,
        blacklistIdentifiers,
      );
    }
    blacklistIdentifiers.add(newIdentifier);
    identifierMap.set(identifier, newIdentifier);
  });

  return identifierMap;
}

/**
 * example for `a.ts` which imports `b.ts` and `c.ts`
 * ```ts
 * Map {
     "b.ts" => "mod",
     "c.ts" => "mod1"
   }
 * ```
 */
export function createImportIdentifierMap(
  graph: Graph,
  items: Item[],
  importIdentifierMap: IdentifierMap = new Map(),
) {
  items.forEach((item) => {
    const input = item.history[0];
    const identifier = input;
    const asset = getAsset(graph, input, item.type);
    if (importIdentifierMap.has(identifier)) return;
    // if (asset.importSpecifier) {
    //   importIdentifierMap.set(identifier, asset.importSpecifier);
    //   return;
    // }
    const size = importIdentifierMap.size;
    const importSpecifier = `mod${size === 0 ? "" : importIdentifierMap.size}`;
    importIdentifierMap.set(identifier, importSpecifier);
    asset.importSpecifier = importSpecifier;
  });
  return importIdentifierMap;
}
