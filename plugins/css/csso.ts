import { csso } from "../../deps.ts";
import { Context, Format, Item, Plugin } from "../plugin.ts";

const syntax = csso.syntax;

export class CssoPlugin extends Plugin {
  async test(item: Item, context: Context) {
    return item.format === Format.Style;
  }
  async optimizeBundle(
    output: string,
    context: Context,
  ) {
    const bundle = context.bundles[output] as string;
    const ast = syntax.parse(bundle);
    const compressedAst = (syntax as any).compress(ast).ast;
    const code = syntax.generate(compressedAst);

    if (code === undefined) {
      throw new Error(`error during csso optimization.`);
    }
    return code;
  }
}
