import { isURL } from "../../../_util.ts";
import { getBase, resolveBase } from "../_util.ts";
import { Chunk, DependencyFormat, DependencyType } from "../../plugin.ts";
import { ImportMap, postcss, posthtml } from "../../../deps.ts";
import { postcssInjectDependenciesPlugin } from "../../css/postcss/inject_dependencies.ts";
import {
  createRelativeOutput,
  getChunk,
  resolveDependency,
} from "../../_util.ts";

function posthtmlInjectDependencies(
  input: string,
  { use = [], root, chunks, importMap }: {
    root: string;
    chunks: Chunk[];
    importMap?: ImportMap;
    use?: postcss.Plugin[];
  },
) {
  return (tree: posthtml.Node) => {
    const base = getBase(tree as unknown as posthtml.RawNode[]);
    const processor = postcss.default([
      ...use,
      postcssInjectDependenciesPlugin(input, { root, chunks, importMap }),
    ]);
    tree.walk((node) => {
      const style = node.attrs?.style;
      if (style != null) {
        const { css } = processor.process(style);
        const attrs = node.attrs as Record<string, string>;
        attrs.style = css;
      }

      switch (node.tag) {
        case "script": {
          let src = node.attrs?.src;
          if (src) {
            src = resolveBase(src, base);
            if (!isURL(src)) src = resolveDependency(input, src, importMap);
            const chunk = getChunk(
              chunks,
              src,
              DependencyType.ImportExport,
              DependencyFormat.Script,
            );
            if (!root.endsWith("/")) root = `${root}/`;

            const attrs = node.attrs as Record<string, string>;
            attrs.src = createRelativeOutput(chunk.output, root);
          }
          break;
        }
        case "img":
        case "source": {
          let src = node.attrs?.src;
          if (src) {
            src = resolveBase(src, base);
            if (!isURL(src)) src = resolveDependency(input, src, importMap);
            const chunk = getChunk(
              chunks,
              src,
              DependencyType.ImportExport,
              DependencyFormat.Binary,
            );

            const attrs = node.attrs as Record<string, string>;
            attrs.src = createRelativeOutput(chunk.output, root);
          }
          const srcset = node.attrs?.srcset;
          if (srcset) {
            const set = srcset.split(",");
            const string = set.map((string) => {
              const [src, ...fragments] = string.trim().split(/\s+/);
              const resolvedUrl = resolveDependency(input, src, importMap);
              const chunk = getChunk(
                chunks,
                resolvedUrl,
                DependencyType.ImportExport,
                DependencyFormat.Binary,
              );
              return [createRelativeOutput(chunk.output, root), ...fragments]
                .join(" ");
            }).join(", ");
            const attrs = node.attrs as Record<string, string>;
            attrs.srcset = string;
          }

          break;
        }
        case "link": {
          let href = node.attrs?.href;
          if (href) {
            href = resolveBase(href, base);
            if (!isURL(href)) {
              href = resolveDependency(input, href, importMap);
            }
            const rel = node.attrs?.rel;
            let type = DependencyType.ImportExport;
            let format = DependencyFormat.Binary;
            switch (rel) {
              case "manifest": {
                type = DependencyType.WebManifest;
                format = DependencyFormat.Json;
                break;
              }
              case "stylesheet": {
                format = DependencyFormat.Style;
                break;
              }
              case "apple-touch-icon":
              case "apple-touch-startup-image":
              case "icon": {
                format = DependencyFormat.Binary;
                break;
              }
            }
            const chunk = getChunk(
              chunks,
              href,
              type,
              format,
            );
            const attrs = node.attrs as Record<string, string>;
            attrs.href = createRelativeOutput(chunk.output, root);
          }
          break;
        }
        case "style": {
          const content = node.content;
          if (content != null) {
            const { css } = processor.process(content);
            node.content = css as unknown as string[];
          }
          break;
        }
      }
      return node;
    });
  };
}

export async function injectDependencies(
  filepath: string,
  source: string,
  { root, chunks, use, importMap }: {
    root: string;
    chunks: Chunk[];
    importMap?: ImportMap;
    use?: postcss.Plugin[];
  },
) {
  const processor = posthtml([
    posthtmlInjectDependencies(
      filepath,
      { root, chunks, importMap, use },
    ),
  ]);
  const { html } = await processor.process(source);

  return html;
}
