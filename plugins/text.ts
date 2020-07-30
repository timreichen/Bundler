import { ts } from "../deps.ts";
import { Include, Exclude, plugin } from "../plugin.ts";

export function text(
  { include, exclude }: { include: Include; exclude?: Exclude },
) {
  const transform = (source: string) => {
    const identifier = `\`${source}\``;
    const ast = ts.createExportDefault(ts.createIdentifier(identifier));
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    return printer.printList(undefined, ts.createNodeArray([ast]), undefined);
  };
  return plugin({
    name: "text",
    include,
    exclude,
    transform,
  });
}
