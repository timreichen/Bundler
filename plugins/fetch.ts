import { FilePlugin } from "./file.ts";
import { DependencyType, Item } from "./plugin.ts";

export class FetchPlugin extends FilePlugin {
  test(item: Item) {
    return item.type === DependencyType.Fetch;
  }
}
