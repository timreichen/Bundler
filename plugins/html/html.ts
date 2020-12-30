import { Imports } from "../../dependency.ts";
import { fs, path, postcss, posthtml } from "../../deps.ts";
import { Asset } from "../../graph.ts";
import { Data, Plugin, TestFunction } from "../plugin.ts";
import { Chunk } from "../../chunk.ts";
import {
  posthtmlExtractImageImports,
  posthtmlExtractInlineStyleImports,
  posthtmlExtractLinkImports,
  posthtmlExtractScriptImports,
  posthtmlExtractStyleImports,
} from "./posthtml/extract_dependencies.ts";
import {
  posthtmlInjectOutputImage,
  posthtmlInjectOutputInlineStyle,
  posthtmlInjectOutputLink,
  posthtmlInjectOutputScript,
  posthtmlInjectOutputStyle,
} from "./posthtml/inject_outputs.ts";

const encoder = new TextEncoder();

export class HtmlPlugin extends Plugin {
  use: postcss.AcceptedPlugin[];
  constructor(
    { test = (input: string) => input.endsWith(".html"), use = [] }: {
      test?: TestFunction;
      use?: postcss.AcceptedPlugin[];
    } = {},
  ) {
    super({ test });
    this.use = use;
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
      posthtmlExtractScriptImports(
        filePath,
        imports,
        { importMap: bundler.importMap },
      ),
      posthtmlExtractLinkImports(
        filePath,
        imports,
        { importMap: bundler.importMap },
      ),
      posthtmlExtractImageImports(
        filePath,
        imports,
        { importMap: bundler.importMap },
      ),
      posthtmlExtractStyleImports(
        filePath,
        imports,
        { importMap: bundler.importMap, use: this.use },
      ),
      posthtmlExtractInlineStyleImports(
        filePath,
        imports,
        { importMap: bundler.importMap, use: this.use },
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
      posthtmlInjectOutputStyle(
        filePath,
        chunk.inputHistory[0],
        graph,
        bundler,
        this.use,
      ),
      posthtmlInjectOutputInlineStyle(
        filePath,
        chunk.inputHistory[0],
        graph,
        bundler,
        this.use,
      ),
    ]);
    const { html } = await processor.process(source as string);
    return encoder.encode(html);
  }
}
