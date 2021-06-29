// deno-lint-ignore-file no-explicit-any
import { csso } from "../../deps.ts";
import { Context, Format, getFormat, Item, Plugin } from "../plugin.ts";

const syntax = csso.syntax;

export class CssoPlugin extends Plugin {
  test(item: Item) {
    return getFormat(item.history[0]) == Format.Style;
  }
  optimizeBundle(
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
