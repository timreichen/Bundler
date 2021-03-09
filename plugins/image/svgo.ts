import { svgo } from "../../deps.ts";
import { Context, Format, Item, Plugin } from "../plugin.ts";

export class SvgoPlugin extends Plugin {
  async test(item: Item, context: Context) {
    const input = item.history[0];
    return item.format === Format.Image && input.endsWith(".svg");
  }
  async optimizeBundle(
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
