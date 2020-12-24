import { terser, terser as terserCore } from "../../deps.ts";
import { Bundles, Data, Plugin, TestFunction } from "../plugin.ts";

export class TerserPlugin extends Plugin {
  options: terser.MinifyOptions;
  constructor(
    { test = (input: string) => input.endsWith(".js"), options = {} }: {
      test?: TestFunction;
      options?: terser.MinifyOptions;
    } = {},
  ) {
    super({ test });
    this.options = options;
  }

  async optimize(
    output: string,
    bundles: Bundles,
    data: Data,
  ) {
    const source = bundles[output] as string;

    const { code } = await terserCore.minify(source, { ...this.options });
    return code as string;
  }
}
