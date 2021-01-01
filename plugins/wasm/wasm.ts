import { fs, path } from "../../deps.ts";
import { Asset } from "../../graph.ts";
import { Data, Plugin, TestFunction } from "../plugin.ts";
import { Chunk } from "../../chunk.ts";
import { isURL } from "../../_util.ts";

export class WasmPlugin extends Plugin {
  constructor(
    { test = (input: string) => input.endsWith(".wasm") }: {
      test?: TestFunction;
    } = {},
  ) {
    super({ test });
  }
  async load(filePath: string) {
    return await Deno.readFile(filePath);
  }
  async createAsset(input: string, data: Data) {
    const { bundler } = data;
    const filePath = input;
    return {
      input,
      filePath,
      output: bundler.outputMap[input] ||
        bundler.createOutput(filePath, path.extname(input)),
      imports: {},
      exports: {},
      type: "wasm",
    } as Asset;
  }
  async createChunk(
    inputHistory: string[],
    chunkList: string[][],
    data: Data,
  ) {
    const { bundler } = data;
    const input = inputHistory[inputHistory.length - 1];
    return new Chunk(bundler, {
      inputHistory,
      dependencies: new Set([input]),
    });
  }
  async createBundle(
    chunk: Chunk,
    data: Data,
  ) {
    const { reload, graph } = data;

    const input = chunk.inputHistory[chunk.inputHistory.length - 1];
    const { filePath, output: outputFilePath } = graph[input];

    const needsUpdate = reload || !await fs.exists(outputFilePath) ||
      Deno.statSync(outputFilePath).mtime! < Deno.statSync(filePath).mtime!;

    if (!needsUpdate) return;
    return await chunk.getSource(input, data) as Uint8Array;
  }
}
