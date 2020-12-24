import { csso as cssoCore } from "../../deps.ts";
import { Data, Plugin, Source, TestFunction } from "../plugin.ts";

const syntax = cssoCore.syntax;

export class CssoPlugin extends Plugin {
  constructor(
    {
      test = (input: string, { optimize }: Data) =>
        optimize && input.endsWith(".css"),
    }: {
      test?: TestFunction;
    } = {},
  ) {
    super({ test });
  }

  async transform(
    input: string,
    source: Source,
    bundleInput: string,
    data: Data,
  ) {
    const ast = syntax.parse(source as string);
    const compressedAst = (syntax as any).compress(ast).ast;
    return syntax.generate(compressedAst);
  }
}
