import { Asset } from "../../graph.ts";
import { Data, Plugin, TestFunction } from "../plugin.ts";

export class JsonPlugin extends Plugin {
  constructor(
    { test = (input: string) => input.endsWith(".json") }: {
      test?: TestFunction;
    } = {},
  ) {
    super({ test });
  }
  async load(filePath: string) {
    return await Deno.readTextFile(filePath);
  }
  async createAsset(
    input: string,
    data: Data,
  ) {
    const { bundler } = data;
    const filePath = input;

    return {
      input,
      filePath,
      output: bundler.outputMap[input] ||
        bundler.createOutput(filePath, ".json"),
      imports: {},
      exports: {},
      type: "json",
    } as Asset;
  }
}
