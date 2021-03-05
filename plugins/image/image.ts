import { Asset } from "../../graph.ts";
import { FilePlugin } from "../file.ts";
import { Context, Format, Item } from "../plugin.ts";

export class ImagePlugin extends FilePlugin {
  async test(item: Item) {
    const input = item.history[0];
    return /\.(png|jpe?g|ico|gif)$/.test(input);
  }
  async readSource(filePath: string, context: Context) {
    return await Deno.readFile(filePath);
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
