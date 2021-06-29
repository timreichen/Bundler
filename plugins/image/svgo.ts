// deno-lint-ignore-file no-explicit-any
import { svgo } from "../../deps.ts";
import { Context, Item, Plugin } from "../plugin.ts";

export class SvgoPlugin extends Plugin {
  test(item: Item) {
    const input = item.history[0];
    return input.endsWith(".svg");
  }
  optimizeBundle(
    output: string,
    context: Context,
  ) {
    const bundle = context.bundles[output] as string;
    const { data } = (svgo as any).optimize(bundle, {
      multipass: true,
    });
    if (data === undefined) {
      throw new Error(`error during svgo optimization.`);
    }
    return data;
  }
}
