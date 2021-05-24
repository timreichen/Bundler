import { Asset } from "../../graph.ts";
import { readFile } from "../../_util.ts";
import { FilePlugin } from "../file.ts";
import { Context, Format, Item } from "../plugin.ts";

export class ImagePlugin extends FilePlugin {
  async test(item: Item) {
    const input = item.history[0];
    return /\.(png|jpe?g|ico|gif)$/.test(input);
  }
  async readSource(input: string, context: Context) {
    return await readFile(input);
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
