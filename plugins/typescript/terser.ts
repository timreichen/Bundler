import { terser } from "../../deps.ts";
import { Context, Format, Item, Plugin } from "../plugin.ts";

export class TerserPlugin extends Plugin {
  options: terser.MinifyOptions;
  constructor(
    { options = {} }: {
      options?: terser.MinifyOptions;
    } = {},
  ) {
    super();
    this.options = options;
  }
  async test(item: Item, context: Context) {
    return item.format === Format.Script;
  }
  async optimizeBundle(
    output: string,
    context: Context,
  ) {
    const bundle = context.bundles[output] as string;

    const { code } = await terser.minify(bundle, this.options);
    if (code === undefined) {
      throw new Error(`code must not be undefined after terser.minify()`);
    }
    return code;
  }
}
