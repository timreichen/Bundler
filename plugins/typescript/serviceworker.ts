import { Data, TestFunction } from "../plugin.ts";
import { Asset } from "../../graph.ts";
import { TypescriptPlugin } from "./typescript.ts";

export class ServiceWorkerPlugin extends TypescriptPlugin {
  constructor(
    {
      test = (input: string, { graph }) =>
        /\.(t|j)sx?$/.test(input) && graph[input].type === "serviceworker",
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
    const { bundler } = data;
    const asset = await super.createAsset(input, data);
    return {
      ...asset,
      output: bundler.outputMap[input] ||
        bundler.createOutput(asset.filePath, ".js"),
      type: "serviceworker",
    } as Asset;
  }
}
