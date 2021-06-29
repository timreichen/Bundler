import { terser } from "../../deps.ts";
import { Context, Format, getFormat, Item, Plugin } from "../plugin.ts";

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
  test(item: Item) {
    return getFormat(item.history[0]) === Format.Script;
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
