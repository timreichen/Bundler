import { isURL } from "../../../_util.ts";
import { getBase, resolveBase } from "../_util.ts";
import { Dependency, DependencyFormat, DependencyType } from "../../plugin.ts";
import { ImportMap, postcss, posthtml } from "../../../deps.ts";
import { postcssExtractDependenciesPlugin } from "../../css/postcss/extract_dependencies.ts";
import { resolveDependency } from "../../_util.ts";

function posthtmlExtractDependencies(dependencies: Dependency[]) {
  return (
    input: string,
    { use = [], importMap }: {
      use?: postcss.Plugin[];
      importMap?: ImportMap;
    },
  ) => {
    return (tree: posthtml.Node) => {
      const postcssPlugin = postcssExtractDependenciesPlugin(dependencies);
      const processor = postcss.default([
        ...use,
        postcssPlugin(input, { importMap }),
      ]);
      const base = getBase(tree as unknown as posthtml.RawNode[]);
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

              if (!isURL(src)) {
                src = resolveDependency(input, src, importMap);
              }
              dependencies.push({
                input: src,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Script,
              });
            }
            break;
          }
          case "img":
          case "source": {
            let src = node.attrs?.src;
            if (src) {
              src = resolveBase(src, base);
              if (!isURL(src)) {
                src = resolveDependency(input, src, importMap);
              }
              dependencies.push({
                input: src,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Binary,
              });
            }
            const srcset = node.attrs?.srcset;
            if (srcset) {
              const set = srcset.split(",");
              const srcs = set.map((string) => string.trim().split(/\s+/)[0]);
              for (const src of srcs) {
                if (src && !isURL(src)) {
                  const resolvedUrl = resolveDependency(input, src, importMap);
                  dependencies.push({
                    input: resolvedUrl,
                    type: DependencyType.ImportExport,
                    format: DependencyFormat.Binary,
                  });
                }
              }
            }
            break;
          }
          case "link": {
            let href = node.attrs?.href;
            if (href) {
              href = resolveBase(href, base);
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

              if (!isURL(href)) {
                href = resolveDependency(input, href, importMap);
              }
              dependencies.push({
                input: href,
                type,
                format,
              });
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
  };
}

export async function extractDependencies(
  filepath: string,
  source: string,
  { use, importMap }: { importMap?: ImportMap; use?: postcss.Plugin[] } = {},
) {
  const dependencies: Dependency[] = [];
  const processor = posthtml([
    posthtmlExtractDependencies(dependencies)(
      filepath,
      { use, importMap },
    ),
  ]);
  await processor.process(source);
  return dependencies;
}
