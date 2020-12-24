import { Chunk } from "../../chunk.ts";
import { Imports } from "../../dependency.ts";
import { fs, path } from "../../deps.ts";
import { Asset } from "../../graph.ts";
import { addRelativePrefix } from "../../_util.ts";
import { Data, Plugin, TestFunction } from "../plugin.ts";

export class WebmanifestPlugin extends Plugin {
  constructor(
    {
      test = (input, { graph }) => graph[input].type === "webmanifest",
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
    const filePath = input;
    const imports: Imports = {};
    const source = await bundler.getSource(
      filePath,
      data,
    );
    const json = JSON.parse(source as string);
    json.icons?.forEach(({ src }: { src: string }) => {
      const resolvedPath = path.join(path.dirname(filePath), src);
      imports[resolvedPath] = {
        specifiers: ["default"],
        type: "image",
      };
    });

    const extension = path.extname(filePath);

    return {
      input,
      filePath,
      output: bundler.outputMap[input] ||
        bundler.createOutput(filePath, extension),
      imports,
      exports: {},
      type: "webmanifest",
    } as Asset;
  }
  async createChunk(
    inputHistory: string[],
    chunkList: string[][],
    { bundler, graph }: Data,
  ) {
    const input = inputHistory[inputHistory.length - 1];
    const { imports, exports } = graph[input];
    const dependencies: Set<string> = new Set([input]);

    Object.keys(imports).forEach((dependency) =>
      chunkList.push([...inputHistory, dependency])
    );
    Object.keys(exports).forEach((dependency) =>
      chunkList.push([...inputHistory, dependency])
    );

    return new Chunk(bundler, {
      inputHistory,
      dependencies,
    });
  }

  async createBundle(
    chunk: Chunk,
    data: Data,
  ) {
    const { graph, bundler, reload } = data;
    const input = chunk.inputHistory[chunk.inputHistory.length - 1];

    const { filePath, output: outputFilePath } = graph[input];
    const exists = await fs.exists(outputFilePath);
    const needsUpdate = reload || !exists ||
      Deno.statSync(outputFilePath).mtime! <
        Deno.statSync(filePath).mtime!;

    if (!needsUpdate) return;
    const bundleOutput = path.dirname(graph[input].output);

    const source = await bundler.getSource(
      input,
      data,
    ) as string;
    const json = JSON.parse(source);

    json.icons?.forEach((item: any) => {
      const resolvedFilePath = path.join(path.dirname(input), item.src);
      const { output: outputFilePath } = graph[resolvedFilePath];

      const relativeOutputFilePath = addRelativePrefix(
        path.relative(bundleOutput, outputFilePath),
      );
      item.src = relativeOutputFilePath;
    });
    const bundleSource = JSON.stringify(json, null, " ");

    return bundleSource;
  }
}
