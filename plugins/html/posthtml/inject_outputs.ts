import { ImportMap, path } from "../../../deps.ts";
import { Graph } from "../../../graph.ts";
import { addRelativePrefix, isURL } from "../../../_util.ts";
import { resolve as resolveDependency } from "../../../dependency.ts";

export function posthtmlInjectOutputScript(
  filepath: string,
  graph: Graph,
  importMap: ImportMap,
) {
  const { output } = graph[filepath];
  const root = path.dirname(output);

  return (tree: any) => {
    tree.match({ tag: "script" }, (node: any) => {
      const src = node.attrs?.src;
      if (src && !isURL(src)) {
        const resolvedUrl = resolveDependency(
          filepath,
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
  filepath: string,
  graph: Graph,
  importMap: ImportMap,
) {
  const { output } = graph[filepath];
  const root = path.dirname(output);

  return (tree: any) => {
    tree.match({ tag: "link" }, (node: any) => {
      const href = node.attrs?.href;
      if (href && !isURL(href)) {
        const resolvedUrl = resolveDependency(
          filepath,
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
  filepath: string,
  graph: Graph,
  importMap: ImportMap,
) {
  const { output } = graph[filepath];
  const root = path.dirname(output);

  return (tree: any) => {
    tree.match({ tag: "img" }, (node: any) => {
      const src = node.attrs?.src;
      if (src && !isURL(src)) {
        const resolvedUrl = resolveDependency(
          filepath,
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
