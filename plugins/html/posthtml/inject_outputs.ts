import { ImportMap, path, postcss } from "../../../deps.ts";
import { Graph } from "../../../graph.ts";
import { addRelativePrefix, isURL } from "../../../_util.ts";
import { resolve as resolveDependency } from "../../../dependency.ts";
import { postcssInjectOutputsPlugin } from "../../css/postcss_plugins/inject_outputs.ts";
import { Bundler } from "../../../bundler.ts";
import { walkAll } from "./_utils.ts";

export function posthtmlInjectOutputScript(
  filePath: string,
  graph: Graph,
  importMap: ImportMap,
) {
  const { output } = graph[filePath];
  const root = path.dirname(output);

  return (tree: any) => {
    tree.match({ tag: "script" }, (node: any) => {
      const src = node.attrs?.src;
      if (src && !isURL(src)) {
        const resolvedUrl = resolveDependency(
          filePath,
          src,
          importMap,
        );
        const { output } = graph[resolvedUrl];
        node.attrs.src = addRelativePrefix(path.relative(root, output));
      }

      return node;
    });
  };
}
export function posthtmlInjectOutputLink(
  filePath: string,
  graph: Graph,
  importMap: ImportMap,
) {
  const { output } = graph[filePath];
  const root = path.dirname(output);
  
  return (tree: any) => {
    tree.match({ tag: "link" }, (node: any) => {
      const href = node.attrs?.href;
      if (href && !isURL(href)) {
        const resolvedUrl = resolveDependency(
          filePath,
          href,
          importMap,
        );
        const { output } = graph[resolvedUrl];
        node.attrs.href = addRelativePrefix(path.relative(root, output));
      }
      return node;
    });
  };
}
export function posthtmlInjectOutputImage(
  filePath: string,
  graph: Graph,
  importMap: ImportMap,
) {
  const { output } = graph[filePath];
  const root = path.dirname(output);

  return (tree: any) => {
    tree.match({ tag: "img" }, (node: any) => {
      const src = node.attrs?.src;
      if (src && !isURL(src)) {
        const resolvedUrl = resolveDependency(
          filePath,
          src,
          importMap,
        );
        const { output } = graph[resolvedUrl];
        node.attrs.src = addRelativePrefix(path.relative(root, output));
      }
      return node;
    });
  };
}
export function posthtmlInjectOutputStyle(
  filePath: string,
  bundleInput: string,
  graph: Graph,
  bundler: Bundler,
  use: postcss.AcceptedPlugin[],
) {
  const postcssPlugin = postcssInjectOutputsPlugin(
    filePath,
    bundleInput,
    graph,
    bundler,
  );
  const processor = postcss.default([
    ...use,
    postcssPlugin,
  ]);

  return (tree: any) => {
    const promises: Promise<any>[] = [];
    return new Promise(async (resolve) => {
      tree.match({ tag: "style" }, (node: any) => {
        const promise = new Promise(async (resolve) => {
          const { css } = await processor.process(node.content);
          node.content = css;
          resolve(null);
        });
        promises.push(promise);
        return node;
      });
      await Promise.all(promises);
      return resolve(tree);
    });
  };
}
export function posthtmlInjectOutputInlineStyle(
  input: string,
  bundleInput: string,
  graph: Graph,
  bundler: Bundler,
  use: postcss.AcceptedPlugin[],
) {
  const postcssPlugin = postcssInjectOutputsPlugin(
    input,
    bundleInput,
    graph,
    bundler,
  );
  const processor = postcss.default([
    ...use,
    postcssPlugin,
  ]);

  const promises: Promise<any>[] = [];
  return (tree: any) => {
    return new Promise(async (resolve) => {
      tree.walk((node: any) => {
        return walkAll(node, (node) => {
          const style = node.attrs?.style;
          if (style) {
            const promise = new Promise(async (resolve) => {
              const { css } = await processor.process(style);
              node.attrs.style = css;
              resolve(null);
            });
            promises.push(promise);
          }
        });
      });
      await Promise.all(promises);
      return resolve(tree);
    });
  };
}
