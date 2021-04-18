import { Asset } from "../../graph.ts";
import { readTextFile } from "../../_util.ts";
import { FilePlugin } from "../file.ts";
import { Context, Format, Item } from "../plugin.ts";

export class SvgPlugin extends FilePlugin {
  async test(item: Item) {
    const input = item.history[0];
    return input.endsWith(".svg");
  }
  async readSource(filePath: string, context: Context) {
    return await readTextFile(filePath);
  }
  async createAsset(
    item: Item,
    context: Context,
  ) {
    return {
      ...await super.createAsset(item, context) as Asset,
      format: Format.Image,
    };
  }
}
