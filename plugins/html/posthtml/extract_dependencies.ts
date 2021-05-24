import { resolve as resolveDependency } from "../../../dependency/dependency.ts";
import { isURL } from "../../../_util.ts";
import { postcss } from "../../../deps.ts";
import { postcssExtractDependenciesPlugin } from "../../css/postcss/extract_dependencies.ts";
import { getBase, resolveBase } from "../_util.ts";
import { Dependencies, DependencyType, Format } from "../../plugin.ts";

export function posthtmlExtractImageDependencies(
  { imports }: Dependencies,
) {
  return (
    input: string,
    { importMap }: { importMap: Deno.ImportMap },
  ) => {
    return (tree: any) => {
      const base = getBase(tree);
      tree.walk((node: any) => {
        if (node.tag === "img") {
          let src = node.attrs?.src;

          src = resolveBase(src, base);

          if (src && !isURL(src)) {
            const resolvedUrl = resolveDependency(
              input,
              src,
              importMap,
            );
            imports[resolvedUrl] = {
              specifiers: {},
              defaults: [],
              namespaces: [],
              types: {},
              type: DependencyType.Import,
              format: Format.Image,
            };
          }
        }

        return node;
      });
    };
  };
}

export function posthtmlExtractLinkDependencies(
  { imports }: Dependencies,
) {
  return (
    input: string,
    { importMap }: { importMap: Deno.ImportMap },
  ) => {
    return (tree: any) => {
      const base = getBase(tree);
      tree.walk((node: any) => {
        if (node.tag === "link") {
          let href = node.attrs?.href;
          href = resolveBase(href, base);
          if (href && !isURL(href)) {
            const resolvedUrl = resolveDependency(
              input,
              href,
              importMap,
            );
            const rel = node.attrs?.rel;

            let format: Format;
            switch (rel) {
              case "stylesheet": {
                format = Format.Style;
                break;
              }
              case "icon": {
                format = Format.Image;
                break;
              }
              case "manifest": {
                format = Format.WebManifest;
                break;
              }
              default: {
                throw new Error(`rel not supported: ${rel}`);
              }
            }
            imports[resolvedUrl] = {
              specifiers: {},
              defaults: [],
              namespaces: [],
              types: {},
              type: DependencyType.Import,
              format,
            };
          }
        }
        return node;
      });
    };
  };
}

export function posthtmlExtractScriptDependencies(
  { imports }: Dependencies,
) {
  return (
    input: string,
    { importMap }: { importMap: Deno.ImportMap },
  ) => {
    return (tree: any) => {
      const base = getBase(tree);

      tree.walk((node: any) => {
        if (node.tag === "script") {
          let src = node.attrs?.src;

          src = resolveBase(src, base);
          if (src && !isURL(src)) {
            const resolvedUrl = resolveDependency(
              input,
              src,
              importMap,
            );
            imports[resolvedUrl] = {
              specifiers: {},
              defaults: [],
              namespaces: [],
              types: {},
              type: DependencyType.Import,
              format: Format.Script,
            };
          }
        }
        return node;
      });
    };
  };
}

export function posthtmlExtractStyleDependencies(
  dependencies: Dependencies,
) {
  return (
    input: string,
    { importMap, use }: {
      importMap: Deno.ImportMap;
      use: postcss.AcceptedPlugin[];
    },
  ) => {
    const postcssPlugin = postcssExtractDependenciesPlugin(dependencies);
    const processor = postcss.default([
      ...use,
      postcssPlugin(input, { importMap }),
    ]);
    const promises: Promise<any>[] = [];
    return async (tree: any) => {
      tree.walk((node: any) => {
        if (node.tag === "style") {
          promises.push(processor.process(node.content));
        }
        return node;
      });
      await Promise.all(promises);
      return tree;
    };
  };
}

export function posthtmlExtractInlineStyleDependencies(
  dependencies: Dependencies,
) {
  return (
    input: string,
    { importMap, use }: {
      importMap: Deno.ImportMap;
      use: postcss.AcceptedPlugin[];
    },
  ) => {
    const postcssPlugin = postcssExtractDependenciesPlugin(dependencies);
    const processor = postcss.default([
      ...use,
      postcssPlugin(input, { importMap }),
    ]);
    const promises: Promise<any>[] = [];
    return async (tree: any) => {
      tree.walk((node: any) => {
        const style = node.attrs?.style;
        if (style) {
          promises.push(processor.process(style));
        }
        return node;
      });
      await Promise.all(promises);
      return tree;
    };
  };
}
