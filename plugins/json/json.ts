import { readTextFile } from "../../_util.ts";
import { FilePlugin } from "../file.ts";
import { Context, Format, Item } from "../plugin.ts";

export class JsonPlugin extends FilePlugin {
  async test(item: Item, context: Context) {
    const input = item.history[0];
    return input.endsWith(".json");
  }
  async readSource(filePath: string, context: Context) {
    return await readTextFile(filePath);
  }
  async createAsset(
    item: Item,
    context: Context,
  ) {
    return {
      ...await super.createAsset(item, context),
      format: Format.Json,
    };
  }
}
