import { FilePlugin } from "../file.ts";
import { Context, Format, Item } from "../plugin.ts";

export class WasmPlugin extends FilePlugin {
  async test(item: Item, context: Context) {
    const input = item.history[0];
    return input.endsWith(".wasm");
  }
  async readSource(filePath: string, context: Context) {
    return await Deno.readFile(filePath);
  }
  async createAsset(
    item: Item,
    context: Context,
  ) {
    return {
      ...await super.createAsset(item, context),
      format: Format.Wasm,
    };
  }
}
