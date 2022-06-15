import { ImportMap, path } from "../../deps.ts";
import { isFileURL, isURL } from "../../_util.ts";
import { DependencyFormat, DependencyType, Plugin } from "../plugin.ts";

export class TextFilePlugin extends Plugin {
  test(_input: string, _type: DependencyType, _format: DependencyFormat) {
    return true;
  }

  protected async readSource(
    input: string,
    _options: { importMap?: ImportMap } = {},
  ) {
    try {
      if (isFileURL(input)) {
        input = path.fromFileUrl(input);
      } else if (isURL(input)) {
        return await fetch(input).then((res) => res.text());
      }
      return await Deno.readTextFile(input);
    } catch (error) {
      console.error(`file not found: ${input}`);
      throw error;
    }
  }
}
