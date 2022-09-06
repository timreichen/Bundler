import { html, ImportMap } from "../../deps.ts";
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
  visitNode,
  Visitor,
} from "./_util.ts";
import * as css from "../css/mod.ts";
import * as typescript from "../typescript/mod.ts";

export async function extractDependencies(
  input: string,
  element: html.Element,
  { importMap }: { importMap?: ImportMap } = {},
) {
  const base = getBase(element);
  const dependencies: Item[] = [];

  const visitor: Visitor = async (element) => {
    const style = element.getAttribute("style");

    if (style) {
      const document = css.parse(style);
      dependencies.push(
        ...await css.extractDependencies(
          input,
          document,
          { importMap },
        ),
      );
    }

    switch (element.tagName.toLowerCase()) {
      case "script": {
        let src = element.getAttribute("src");
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
        } else if (element.textContent) {
          const document = typescript.parse(element.textContent);
          dependencies.push(
            ...await typescript.extractDependencies(input, document, {
              importMap,
            }),
          );
        }
        break;
      }
      case "video": {
        let poster = element.getAttribute("poster");
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
        let src = element.getAttribute("src");
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
        const srcset = element.getAttribute("srcset");
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
        let href = element.getAttribute("href");
        if (href) {
          href = resolveBase(String(href), String(base));
          const rel = element.getAttribute("rel");
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
          if (element.textContent) {
            const document = css.parse(element.textContent);
            dependencies.push(
              ...await css.extractDependencies(input, document, { importMap }),
            );
          }
        }
        break;
    }

    return await visitEachChild(element, visitor);
  };

  await visitNode(element, visitor);

  return dependencies;
}
