import { Bundler } from "../../bundler.ts";
import { fs, path } from "../../deps.ts";
import { Asset, Graph } from "../../graph.ts";
import { Chunks, Data, Plugin, TestFunction } from "../plugin.ts";
import { Chunk } from "../../chunk.ts";

const encoder = new TextEncoder();

export class SvgPlugin extends Plugin {
  constructor(
    { test = (input: string) => input.endsWith(".svg") }: {
      test?: TestFunction;
    } = {},
  ) {
    super({ test });
  }
  async load(filePath: string) {
    return Deno.readTextFile(filePath);
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
        bundler.createOutput(filePath, path.extname(input)),
      imports: {},
      exports: {},
      type: "image",
    } as Asset;
  }
  async createChunk(
    inputHistory: string[],
    chunkList: string[][],
    data: Data,
  ) {
    const { bundler, graph } = data;
    const input = inputHistory[inputHistory.length - 1];
    const asset = graph[input];
    const dependencies = Object.keys(asset.imports);
    dependencies.forEach((dependency) =>
      chunkList.push([...inputHistory, dependency])
    );
    return new Chunk(bundler, {
      inputHistory,
      dependencies: new Set([input]),
    });
  }
  async createBundle(
    chunk: Chunk,
    data: Data,
  ) {
    const { bundler, graph, reload } = data;
    const input = chunk.inputHistory[chunk.inputHistory.length - 1];
    const { filePath, output: outputFilePath } = graph[input];

    const needsUpdate = reload || !await fs.exists(outputFilePath) ||
      Deno.statSync(outputFilePath).mtime! < Deno.statSync(filePath).mtime!;

    if (!needsUpdate) return;
    const source = await chunk.getSource(input, data) as string;
    return encoder.encode(source);
  }
}
