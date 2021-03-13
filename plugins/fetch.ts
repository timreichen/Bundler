import { FilePlugin } from "./file.ts";
import { Context, DependencyType, Item } from "./plugin.ts";

export class FetchPlugin extends FilePlugin {
  async test(item: Item, context: Context) {
    return item.type === DependencyType.Fetch;
  }
}
