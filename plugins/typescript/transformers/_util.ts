const regex = /^(?<identifier>.+?)(?<number>\d+)$/;
export function createNextIdentifier(
  identifier: string,
  blacklistIdentifiers: Set<string>,
) {
  const groups = regex.exec(identifier)?.groups || {};
  let number = parseInt(groups.number) || 0;
  const rawIdentifier = groups.identifier || identifier;
  let newIdentifier = groups.identifier || identifier;
  while (blacklistIdentifiers.has(newIdentifier)) {
    number += 1;
    newIdentifier = rawIdentifier + number;
  }
  return newIdentifier;
}
