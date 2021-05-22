import { path, postcss, posthtml, Sha256 } from "../../deps.ts";
import { getAsset } from "../../graph.ts";
import { readTextFile } from "../../_util.ts";
import {
  Chunk,
  ChunkList,
  Context,
  Dependencies,
  Format,
  Item,
  Plugin,
} from "../plugin.ts";
import {
  posthtmlExtractImageDependencies,
  posthtmlExtractInlineStyleDependencies,
  posthtmlExtractLinkDependencies,
  posthtmlExtractScriptDependencies,
  posthtmlExtractStyleDependencies,
} from "./posthtml/extract_dependencies.ts";
import { posthtmlInjectBase } from "./posthtml/inject_base.ts";
import {
  posthtmlInjectImageDependencies,
  posthtmlInjectInlineStyleDependencies,
  posthtmlInjectLinkDependencies,
  posthtmlInjectScriptDependencies,
  posthtmlInjectStyleDependencies,
} from "./posthtml/inject_dependencies.ts";

export class HtmlPlugin extends Plugin {
  use: postcss.AcceptedPlugin[];
  constructor(
    { use = [] }: {
      use?: postcss.AcceptedPlugin[];
    } = {},
  ) {
    super();
    this.use = use;
  }
  async test(item: Item) {
    const input = item.history[0];
    return input.endsWith(".html");
  }
  async readSource(filePath: string) {
    return readTextFile(filePath);
  }
  async createAsset(
    item: Item,
    context: Context,
  ) {
    const input = item.history[0];
    const { bundler, importMap, outputMap, depsDirPath } = context;
    const source = await bundler.readSource(item, context) as string;
    const dependencies: Dependencies = { imports: {}, exports: {} };
    const processor = posthtml([
      posthtmlExtractScriptDependencies(dependencies)(
        input,
        { importMap },
      ),
      posthtmlExtractLinkDependencies(dependencies)(
        input,
        { importMap },
      ),
      posthtmlExtractImageDependencies(dependencies)(
        input,
        { importMap },
      ),
      posthtmlExtractStyleDependencies(dependencies)(
        input,
        { importMap, use: this.use },
      ),
      posthtmlExtractInlineStyleDependencies(dependencies)(
        input,
        { importMap, use: this.use },
      ),
    ]);
    await processor.process(source);

    const extension = path.extname(input);
    return {
      filePath: input,
      output: outputMap[input] ||
        path.join(
          depsDirPath,
          `${new Sha256().update(input).hex()}${extension}`,
        ),
      dependencies,
      format: Format.Html,
    };
  }
  async createChunk(
    item: Item,
    context: Context,
    chunkList: ChunkList,
  ) {
    const dependencyItems: Item[] = [];
    const { history, type } = item;
    const chunkInput = history[0];
    const asset = getAsset(context.graph, chunkInput, type);

    const dependencies = [
      ...Object.entries(asset.dependencies.imports),
      ...Object.entries(asset.dependencies.exports),
    ];
    for (const [input, dependency] of dependencies) {
      if (input === chunkInput) continue;
      const { type, format } = dependency;
      const newItem: Item = {
        history: [input, ...item.history],
        type,
        format,
      };
      chunkList.push(newItem);
    }

    return {
      item,
      dependencyItems,
    };
  }

  async createBundle(
    bundleChunk: Chunk,
    context: Context,
  ) {
    const { bundler, reload, graph, outDirPath } = context;
    const bundleItem = bundleChunk.item;
    const { history, type } = bundleItem;
    const bundleInput = history[0];
    const bundleAsset = getAsset(graph, bundleInput, type);

    const { filePath, output } = bundleAsset;

    try {
      const bundleNeedsUpdate = reload == true ||
        (Array.isArray(reload) && reload.includes(bundleInput)) ||
        Deno.statSync(output).mtime! < Deno.statSync(filePath).mtime!;
      if (!bundleNeedsUpdate) return;
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
    }

    const source = await bundler.transformSource(
      bundleInput,
      bundleChunk.item,
      context,
    ) as string;

    const bundleOutput = bundleAsset.output;
    const processor = posthtml([
      posthtmlInjectScriptDependencies(filePath, bundleOutput, context),
      posthtmlInjectLinkDependencies(filePath, bundleOutput, context),
      posthtmlInjectImageDependencies(filePath, bundleOutput, context),
      posthtmlInjectStyleDependencies(
        bundleItem,
        context,
        this.use,
      ),
      posthtmlInjectInlineStyleDependencies(
        bundleItem,
        context,
        this.use,
      ),
      posthtmlInjectBase(context),
    ]);
    const { html } = await processor.process(source as string);
    // await bundler.setCache(bundleInput, bundleInput, html, context);

    return html;
  }
}
