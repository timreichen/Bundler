import { readFile } from "../../_util.ts";
import { FilePlugin } from "../file.ts";
import { Item } from "../plugin.ts";

export class ImagePlugin extends FilePlugin {
  test(item: Item) {
    const input = item.history[0];
    return /\.(png|jpe?g|ico|gif)$/.test(input);
  }
  async readSource(input: string) {
    return await readFile(input);
  }
}
