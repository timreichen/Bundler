export function getIdentifier(
  importIdentifierMap: Map<string, string>,
  input: string,
): string {
  if (!importIdentifierMap.has(input)) {
    throw Error(
      `identifier for input not found: ${input}`,
    );
  }
  const identifier = importIdentifierMap.get(input)!;
  return identifier;
}
