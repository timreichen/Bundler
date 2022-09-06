import { html, ImportMap } from "../../deps.ts";
import { isURL } from "../../_util.ts";
import * as typescript from "../typescript/mod.ts";
import * as css from "../css/mod.ts";
import { Chunk, DependencyFormat, DependencyType, Item } from "../plugin.ts";
import {
  getBase,
  resolveBase,
  visitEachChild,
  visitNode,
  Visitor,
} from "./_util.ts";
import { Bundler } from "../../bundler.ts";
import { createRelativeOutput, getChunk, resolveDependency } from "../_util.ts";

export async function injectDependencies(
  input: string,
  element: html.Element,
  dependencyItems: Item[],
  chunks: Chunk[],
  bundler: Bundler,
  { importMap, root }: {
    root: string;
    importMap?: ImportMap;
  },
) {
  const base = getBase(element);

  let i = 0;

  const visitor: Visitor = async (element) => {
    const style = element.getAttribute("style");
    if (style) {
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
      element.setAttribute("style", bundle.source);
    }

    switch (element.tagName.toLowerCase()) {
      case "script": {
        let src = element.getAttribute("src");
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

          element.setAttribute("src", createRelativeOutput(chunk.output, root));
        } else if (element.textContent) {
          const ast = typescript.parse(element.textContent);
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

          element.textContent = bundle.source;
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
          const chunk = getChunk(
            chunks,
            poster,
            DependencyType.ImportExport,
            DependencyFormat.Binary,
          );

          element.setAttribute(
            "poster",
            createRelativeOutput(chunk.output, root),
          );
        }
        break;
      }
      case "img":
      case "source": {
        let src = element.getAttribute("src");
        if (src) {
          src = resolveBase(String(src), base);
          if (!isURL(src)) src = resolveDependency(input, src, importMap);
          const chunk = getChunk(
            chunks,
            src,
            DependencyType.ImportExport,
            DependencyFormat.Binary,
          );

          element.setAttribute("src", createRelativeOutput(chunk.output, root));
        }
        const srcset = element.getAttribute("srcset");
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
          element.setAttribute("srcset", string);
        }
        break;
      }
      case "link": {
        let href = element.getAttribute("href");
        if (href) {
          href = resolveBase(String(href), base);
          if (!isURL(href)) {
            href = resolveDependency(input, href, importMap);
          }
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

          const chunk = getChunk(
            chunks,
            href,
            type,
            format,
          );
          element.setAttribute(
            "href",
            createRelativeOutput(chunk.output, root),
          );
        }
        break;
      }
      case "style": {
        if (element.textContent) {
          const ast = css.parse(element.textContent);

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
          element.textContent = bundle.source;
        }
        break;
      }
    }

    return await visitEachChild(element, visitor);
  };

  return await visitNode(element, visitor);
}
