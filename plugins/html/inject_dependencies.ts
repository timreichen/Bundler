import { ImportMap, posthtml } from "../../deps.ts";
import { isURL } from "../../_util.ts";
import * as typescript from "../typescript/mod.ts";
import * as css from "../css/mod.ts";
import { Chunk, DependencyFormat, DependencyType, Item } from "../plugin.ts";
import {
  getBase,
  resolveBase,
  visitEachChild,
  visitNodes,
  Visitor,
} from "./_util.ts";
import { Bundler } from "../../bundler.ts";
import { createRelativeOutput, getChunk, resolveDependency } from "../_util.ts";

export async function injectDependencies(
  input: string,
  dependencyItems: Item[],
  ast: posthtml.Node[],
  chunks: Chunk[],
  bundler: Bundler,
  { importMap, root }: {
    root: string;
    importMap?: ImportMap;
  },
) {
  // avoid original ast mutations
  ast = structuredClone(ast);

  const base = getBase(ast);

  let i = 0;

  const visitor: Visitor = async (node) => {
    const attrs = node.attrs;
    const style = attrs?.style;
    if (attrs) {
      if (style != null) {
        const ast = css.parse(String(style));
        const dependencyInput = `${input}.${i++}.css`;
        const inlineItem = {
          input: dependencyInput,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Style,
        };

        const bundle = await bundler.createBundle(
          {
            item: inlineItem,
            dependencyItems,
            output: "inline",
          },
          ast,
          bundler,
          { chunks, root, importMap },
        );
        attrs.style = bundle.source;
      }
    }

    switch (node.tag) {
      case "script": {
        let src = node.attrs?.src;
        if (src) {
          src = resolveBase(String(src), base);
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
        } else if (Array.isArray(node.content)) {
          const content = node.content[0];
          if (content != null) {
            const ast = typescript.parse(content.toString());
            const dependencyInput = `${input}.${i++}.ts`;
            const inlineItem = {
              input: dependencyInput,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
            };
            const bundle = await bundler.createBundle(
              {
                item: inlineItem,
                dependencyItems,
                output: "inline",
              },
              ast,
              bundler,
              { chunks, root, importMap },
            );

            node.content[0] = bundle.source;
          }
        }
        break;
      }
      case "video": {
        let poster = node.attrs?.poster;
        if (poster) {
          poster = resolveBase(String(poster), base);
          if (!isURL(poster)) {
            poster = resolveDependency(input, poster, importMap);
          }
          const chunk = getChunk(
            chunks,
            poster,
            DependencyType.ImportExport,
            DependencyFormat.Binary,
          );

          const attrs = node.attrs as Record<string, string>;
          attrs.poster = createRelativeOutput(chunk.output, root);
        }
        break;
      }
      case "img":
      case "source": {
        let src = node.attrs?.src;
        if (src) {
          src = resolveBase(String(src), base);
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
          const set = String(srcset).split(",");
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
          href = resolveBase(String(href), base);
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
        if (Array.isArray(node.content)) {
          const content = node.content?.[0];
          if (content != null) {
            const ast = css.parse(content.toString());

            const dependencyInput = `${input}.${i++}.css`;
            const inlineItem = {
              input: dependencyInput,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Style,
            };

            const bundle = await bundler.createBundle(
              {
                item: inlineItem,
                dependencyItems,
                output: "inline",
              },
              ast,
              bundler,
              { chunks, root, importMap },
            );
            node.content[0] = bundle.source;
          }
        }
      }
    }

    return await visitEachChild(node, visitor);
  };

  return await visitNodes(ast, visitor);
}
