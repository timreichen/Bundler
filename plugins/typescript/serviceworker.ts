import { path, Sha256, ts } from "../../deps.ts";
import { Context, DependencyType, Item } from "../plugin.ts";
import { SystemPlugin } from "./system.ts";

export class ServiceWorkerPlugin extends SystemPlugin {
  constructor(
    {
      compilerOptions = {},
    }: {
      compilerOptions?: ts.CompilerOptions;
    } = {},
  ) {
    super({ compilerOptions });
  }
  async test(item: Item, context: Context) {
    return item.type === DependencyType.ServiceWorker &&
      await super.test(item, context);
  }
  async createAsset(
    item: Item,
    context: Context,
  ) {
    const input = item.history[0];
    const { outDirPath } = context;
    const extension = ".js";
    return {
      ...await super.createAsset(item, context),
      // if is webworker or serviceworker, it should in dist dir rather than deps dir
      // TODO where to put if source file is not in root?
      output: path.join(
        outDirPath,
        `${new Sha256().update(input).hex()}${extension}`,
      ),
    };
  }
}
