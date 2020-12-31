import { Data, TestFunction } from "../plugin.ts";
import { Asset } from "../../graph.ts";
import { TypescriptPlugin } from "./typescript.ts";

export class WebWorkerPlugin extends TypescriptPlugin {
  constructor(
    {
      test = (input: string, { graph }) =>
        /\.(t|j)sx?$/.test(input) && graph[input].type === "webworker",
    }: {
      test?: TestFunction;
    } = {},
  ) {
    super({ test });
  }
  async createAsset(
    input: string,
    data: Data,
  ) {
    const asset = await super.createAsset(input, data);

    return {
      ...asset,
      type: "webworker",
    } as Asset;
  }
}
