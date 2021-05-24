import { path, postcss } from "../../../deps.ts";
import { addRelativePrefix, isURL } from "../../../_util.ts";
import { resolve as resolveDependency } from "../../../dependency/dependency.ts";
import { getBase, resolveBase } from "../_util.ts";
import { postcssInjectDependenciesPlugin } from "../../css/postcss/inject_dependencies.ts";
import { getAsset, Graph } from "../../../graph.ts";
import { Context, DependencyType, Item } from "../../plugin.ts";
import { postcssInjectImportsPlugin } from "../../css/postcss/inject_imports.ts";

export function posthtmlInjectScriptDependencies(
  bundleInput: string,
  bundleOutput: string,
  { importMap, graph, outDirPath }: {
    importMap: Deno.ImportMap;
    graph: Graph;
    outDirPath: string;
  },
) {
  const bundleDirPath = path.dirname(bundleOutput);

  return async (tree: any) => {
    const base = getBase(tree);

    // let scriptIndex = 0;
    // const promises: Promise<any>[] = [];

    tree.walk((node: any) => {
      if (node.tag === "script") {
        let src = node.attrs?.src;
        src = resolveBase(src, base);
        if (src && !isURL(src)) {
          const resolvedUrl = resolveDependency(
            bundleInput,
            src,
            importMap,
          );
          const asset = getAsset(graph, resolvedUrl, DependencyType.Import);

          node.attrs.src = addRelativePrefix(
            path.relative(bundleDirPath, asset.output),
          );
          node.attrs.type = "module";
        } else if (node.content?.[0]) {
          // const promise = new Promise(async (resolve) => {
          //   // const source = node.content[0];
          //   // const identifier = `_${scriptIndex++}.ts`;
          //   // const dependency = path.join(bundleInput, identifier);
          //   // bundler.sources[dependency] = source;
          //   // const dependencyAsset = await bundler.createAsset(
          //   //   dependency,
          //   //   DependencyType.Import,
          //   //   context,
          //   // );
          //   // graph.set(dependency, dependencyAsset);
          //   // const dependencyChunk = await bundler.createChunk(
          //   //   dependency,
          //   //   [dependency, ...chunk.history],
          //   //   [],
          //   //   context,
          //   // );
          //   // const bundle = await bundler.createBundle(
          //   //   input,
          //   //   dependencyChunk,
          //   //   context,
          //   // );
          //   // node.content[0] = bundle;
          //   resolve(undefined);
          // });
          // promises.push(promise);
        }
      }

      return node;
    });
    // await Promise.all(promises);
    return tree;
  };
}
export function posthtmlInjectLinkDependencies(
  bundleInput: string,
  bundleOutput: string,
  { graph, importMap, outDirPath }: {
    graph: Graph;
    importMap: Deno.ImportMap;
    outDirPath: string;
  },
) {
  const bundleDirPath = path.dirname(bundleOutput);

  return (tree: any) => {
    const base = getBase(tree);

    tree.walk((node: any) => {
      if (node.tag === "link") {
        let href = node.attrs?.href;
        href = resolveBase(href, base);
        if (href && !isURL(href)) {
          const resolvedUrl = resolveDependency(
            bundleInput,
            href,
            importMap,
          );
          const asset = getAsset(graph, resolvedUrl, DependencyType.Import);
          node.attrs.href = addRelativePrefix(
            path.relative(bundleDirPath, asset.output),
          );
        }
      }
      return node;
    });
    return tree;
  };
}
export function posthtmlInjectImageDependencies(
  bundleInput: string,
  bundleOutput: string,
  { graph, importMap, outDirPath }: {
    graph: Graph;
    importMap: Deno.ImportMap;
    outDirPath: string;
  },
) {
  const bundleDirPath = path.dirname(bundleOutput);

  return (tree: any) => {
    const base = getBase(tree);

    tree.walk((node: any) => {
      if (node.tag === "img") {
        let src = node.attrs?.src;
        src = resolveBase(src, base);
        if (src && !isURL(src)) {
          const resolvedUrl = resolveDependency(
            bundleInput,
            src,
            importMap,
          );
          const asset = getAsset(graph, resolvedUrl, DependencyType.Import);

          node.attrs.src = addRelativePrefix(
            path.relative(bundleDirPath, asset.output),
          );
        }
      }
      return node;
    });
    return tree;
  };
}
export function posthtmlInjectStyleDependencies(
  item: Item,
  context: Context,
  use: postcss.AcceptedPlugin[],
) {
  const bundleInput = item.history[0];
  const { graph, outDirPath } = context;
  const asset = getAsset(graph, bundleInput, item.type);
  const processor = postcss.default([
    ...use,
    postcssInjectImportsPlugin(item, context, use),
    postcssInjectDependenciesPlugin(bundleInput, asset.output, { graph }),
  ]);

  return async (tree: any) => {
    const promises: Promise<any>[] = [];
    tree.walk((node: any) => {
      if (node.tag === "style") {
        const promise = new Promise(async (resolve) => {
          const { css } = await processor.process(node.content);
          node.content = css;
          resolve(null);
        });
        promises.push(promise);
      }
      return node;
    });
    await Promise.all(promises);
    return tree;
  };
}
export function posthtmlInjectInlineStyleDependencies(
  item: Item,
  context: Context,
  use: postcss.AcceptedPlugin[],
) {
  const bundleInput = item.history[0];
  const { graph } = context;

  const asset = getAsset(graph, bundleInput, item.type);

  const processor = postcss.default([
    ...use,
    // postcssInjectImportsPlugin(chunk, context, use), /* disabled because @import are not possible in script attributes */
    postcssInjectDependenciesPlugin(bundleInput, asset.output, {
      graph,
    }),
  ]);

  const promises: Promise<any>[] = [];
  return async (tree: any) => {
    tree.walk((node: any) => {
      const style = node.attrs?.style;
      if (style) {
        const promise = new Promise(async (resolve) => {
          const { css } = await processor.process(style);
          node.attrs.style = css;
          resolve(undefined);
        });
        promises.push(promise);
      }
      return node;
    });
    await Promise.all(promises);
    return tree;
  };
}
