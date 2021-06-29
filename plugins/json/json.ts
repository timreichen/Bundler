import { readTextFile } from "../../_util.ts";
import { FilePlugin } from "../file.ts";
import { Item } from "../plugin.ts";

export class JsonPlugin extends FilePlugin {
  test(item: Item) {
    const input = item.history[0];
    return input.endsWith(".json");
  }
  async readSource(input: string) {
    return await readTextFile(input);
  }
}
