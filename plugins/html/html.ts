import { Bundler } from "../../bundler.ts";
import { Imports } from "../../dependency.ts";
import { fs, path, posthtml } from "../../deps.ts";
import { Asset, Graph } from "../../graph.ts";
import { Chunks, Data, Plugin, TestFunction } from "../plugin.ts";
import { Chunk } from "../../chunk.ts";
import {
  posthtmlExtractImageUrl,
  posthtmlExtractLinkUrl,
  posthtmlExtractScriptUrl,
} from "./posthtml/extract_dependencies.ts";
import {
  posthtmlInjectOutputImage,
  posthtmlInjectOutputLink,
  posthtmlInjectOutputScript,
} from "./posthtml/inject_outputs.ts";

const encoder = new TextEncoder();

export class HtmlPlugin extends Plugin {
  constructor(
    { test = (input: string) => input.endsWith(".html") }: {
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
    const source = await bundler.getSource(
      filePath,
      data,
    ) as string;

    const imports: Imports = {};
    const processor = posthtml([
      posthtmlExtractScriptUrl(
        filePath,
        imports,
        { importMap: bundler.importMap },
      ),
      posthtmlExtractLinkUrl(
        filePath,
        imports,
        { importMap: bundler.importMap },
      ),
      posthtmlExtractImageUrl(
        filePath,
        imports,
        { importMap: bundler.importMap },
      ),
    ]);
    await processor.process(source);
    
    return {
      input,
      filePath,
      output: bundler.outputMap[input] ||
        bundler.createOutput(filePath, path.extname(input)),
      imports,
      exports: {},
      type: "html",
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
    const exists = await fs.exists(outputFilePath);
    const needsUpdate = reload || !exists ||
      Deno.statSync(outputFilePath).mtime! <
        Deno.statSync(filePath).mtime!;

    if (!needsUpdate) return;
    const source = await bundler.getSource(
      input,
      data,
    ) as string;
    const processor = posthtml([
      posthtmlInjectOutputScript(filePath, graph, bundler.importMap),
      posthtmlInjectOutputLink(filePath, graph, bundler.importMap),
      posthtmlInjectOutputImage(filePath, graph, bundler.importMap),
    ]);
    const { html } = await processor.process(source as string);
    return encoder.encode(html);
  }
}
