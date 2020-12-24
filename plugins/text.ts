import { Data, Plugin, Source } from "./plugin.ts";

export class TextPlugin extends Plugin {
  async transform(
    input: string,
    source: Source,
    bundleInput: string,
    data: Data,
  ) {
    return `\`${source}\``;
  }
}
