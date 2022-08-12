import { ImportMap, posthtml } from "../../deps.ts";
import { isURL } from "../../_util.ts";
import {
  DependencyFormat,
  DependencyType,
  Item,
  resolveDependency,
} from "../_util.ts";
import {
  getBase,
  resolveBase,
  visitEachChild,
  visitNodes,
  Visitor,
} from "./_util.ts";
import * as css from "../css/mod.ts";
import * as typescript from "../typescript/mod.ts";

export async function extractDependencies(
  input: string,
  ast: posthtml.Node[],
  { importMap }: { importMap?: ImportMap } = {},
) {
  const base = getBase(ast);
  const dependencies: Item[] = [];

  const visitor: Visitor = async (node) => {
    const attrs = node.attrs;

    if (attrs) {
      const style = attrs.style;
      if (style != null) {
        const ast = css.parse(String(style));
        dependencies.push(
          ...await css.extractDependencies(
            input,
            ast,
            { importMap },
          ),
        );
      }
    }

    switch (node.tag) {
      case "script": {
        let src = node.attrs?.src;
        if (src) {
          src = resolveBase(String(src), base);

          if (!isURL(src)) {
            src = resolveDependency(input, src, importMap);
          }
          dependencies.push({
            input: src,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          });
        } else if (node.content) {
          const content =
            (Array.isArray(node.content) ? node.content : [node.content])[0];
          const ast = typescript.parse(content.toString());
          dependencies.push(
            ...await typescript.extractDependencies(input, ast, { importMap }),
          );
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
          dependencies.push({
            input: poster,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Binary,
          });
        }
        break;
      }
      case "img":
      case "source": {
        let src = node.attrs?.src;
        if (src) {
          src = resolveBase(String(src), base);
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
          const set = String(srcset).split(",");
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
          href = resolveBase(String(href), String(base));
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
      case "style":
        {
          if (node.content) {
            const content =
              (Array.isArray(node.content) ? node.content : [node.content])[0];
            const ast = css.parse(content.toString());
            dependencies.push(
              ...await css.extractDependencies(input, ast, { importMap }),
            );
          }
        }
        break;
    }

    return await visitEachChild(node, visitor);
  };

  await visitNodes(ast, visitor);

  return dependencies;
}
