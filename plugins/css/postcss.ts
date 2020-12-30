import { postcss } from "../../deps.ts";
import { Data, Plugin, Source, TestFunction } from "../plugin.ts";

export class PostcssPlugin extends Plugin {
  use: postcss.AcceptedPlugin[];
  constructor(
    {
      test = (input: string) => input.endsWith(".css"),
      use = [],
    }: {
      test?: TestFunction;
      use?: postcss.AcceptedPlugin[];
    } = {},
  ) {
    super({ test });
    this.use = use;
  }

  async transform(
    input: string,
    source: Source,
    bundleInput: string,
    data: Data,
  ) {
    const processor = postcss.default(this.use);
    
    const { css } = await processor.process(source as string);
    return css;
  }
}
