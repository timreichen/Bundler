import { path, postcss, posthtml, Sha256 } from "../../deps.ts";
import { getAsset } from "../../graph.ts";
import { readTextFile } from "../../_util.ts";
import {
  Chunk,
  Context,
  DependencyType,
  Item,
  ModuleData,
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
  test(item: Item) {
    const input = item.history[0];
    return input.endsWith(".html");
  }
  readSource(input: string) {
    return readTextFile(input);
  }
  async createAsset(
    item: Item,
    context: Context,
  ) {
    const input = item.history[0];
    const { bundler, importMap, outputMap, depsDirPath } = context;
    const source = await bundler.readSource(item, context) as string;
    const moduleData: ModuleData = { dependencies: {}, export: {} };
    const processor = posthtml([
      posthtmlExtractScriptDependencies(moduleData)(
        input,
        { importMap },
      ),
      posthtmlExtractLinkDependencies(moduleData)(
        input,
        { importMap },
      ),
      posthtmlExtractImageDependencies(moduleData)(
        input,
        { importMap },
      ),
      posthtmlExtractStyleDependencies(moduleData)(
        input,
        { importMap, use: this.use },
      ),
      posthtmlExtractInlineStyleDependencies(moduleData)(
        input,
        { importMap, use: this.use },
      ),
    ]);
    await processor.process(source);

    const extension = path.extname(input);

    return {
      input,
      output: outputMap[input] ||
        path.join(
          depsDirPath,
          `${new Sha256().update(input).hex()}${extension}`,
        ),
      dependencies: moduleData.dependencies,
      export: moduleData.export,
      type: item.type,
    };
  }
  createChunk(
    item: Item,
    context: Context,
    chunkList: Item[],
  ) {
    const dependencyItems: Item[] = [];
    const { history, type } = item;
    const chunkInput = history[0];
    const asset = getAsset(context.graph, chunkInput, type);

    Object.entries(asset.dependencies).forEach(([dependency, dependencies]) => {
      Object.keys(dependencies).forEach((type) => {
        const newItem: Item = {
          history: [dependency, ...item.history],
          type: type as DependencyType,
        };
        chunkList.push(newItem);
      });
    });

    return {
      item,
      dependencyItems,
    };
  }

  async createBundle(
    bundleChunk: Chunk,
    context: Context,
  ) {
    const { bundler, reload, graph } = context;
    const bundleItem = bundleChunk.item;
    const { history, type } = bundleItem;
    const bundleInput = history[0];
    const bundleAsset = getAsset(graph, bundleInput, type);

    const { input, output } = bundleAsset;

    try {
      const bundleNeedsUpdate = reload == true ||
        (Array.isArray(reload) && reload.includes(bundleInput)) ||
        Deno.statSync(output).mtime! < Deno.statSync(input).mtime!;
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
    const outputDirPath = path.dirname(output);

    let basePath = path.isAbsolute(output)
      ? outputDirPath
      : path.relative(context.outDirPath, outputDirPath);

    if (basePath.startsWith(".")) {
      basePath = path.resolve(basePath, "/");
    }
    if (!basePath.startsWith("/")) {
      basePath = "/" + basePath;
    }
    if (!basePath.endsWith("/")) {
      basePath += "/";
    }

    const processor = posthtml([
      posthtmlInjectScriptDependencies(input, bundleOutput, context),
      posthtmlInjectLinkDependencies(input, bundleOutput, context),
      posthtmlInjectImageDependencies(input, bundleOutput, context),
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
      posthtmlInjectBase(basePath),
    ]);
    const { html } = await processor.process(source as string);

    return html;
  }
}
