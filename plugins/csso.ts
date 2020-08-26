import cssoCore from "https://jspm.dev/csso";
import { Exclude, Include, plugin } from "../plugin.ts";
export function csso(
  config: {
    include?: Include;
    exclude?: Exclude;
    options?: { use: unknown[] };
  } = {},
) {
  const { include, exclude, options } = {
    include: (path: string) => /\.css$/.test(path),
    options: {},
    ...config,
  };

  const transform = async (source: string, path: string) => {
    const syntax = (cssoCore as { syntax: any }).syntax;
    const ast = syntax.parse(source);
    const compressedAst = syntax.compress(ast).ast;
    return syntax.generate(compressedAst);
  };

  return plugin({
    name: "csso",
    include,
    exclude,
    transform,
  });
}
