// deno-lint-ignore-file no-explicit-any
import { resolve as resolveDependency } from "../../../dependency/dependency.ts";
import { isURL } from "../../../_util.ts";
import { postcss } from "../../../deps.ts";
import { postcssExtractDependenciesPlugin } from "../../css/postcss/extract_dependencies.ts";
import { getBase, resolveBase } from "../_util.ts";
import { DependencyType, ModuleData } from "../../plugin.ts";

export function posthtmlExtractImageDependencies(
  moduleData: ModuleData,
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
            moduleData.dependencies[resolvedUrl] = {
              [DependencyType.Import]: {},
            };
          }
        }

        return node;
      });
    };
  };
}

export function posthtmlExtractLinkDependencies(
  moduleData: ModuleData,
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

            let type: DependencyType;
            switch (rel) {
              case undefined:
              case "stylesheet":
              case "icon":
                type = DependencyType.Import;
                break;
              case "manifest": {
                type = DependencyType.WebManifest;
                break;
              }
              default: {
                throw new Error(`rel not supported: ${rel}`);
              }
            }
            moduleData.dependencies[resolvedUrl] = {
              [type]: {},
            };
          }
        }
        return node;
      });
    };
  };
}

export function posthtmlExtractScriptDependencies(
  moduleData: ModuleData,
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
            moduleData.dependencies[resolvedUrl] = {
              [DependencyType.Import]: {},
            };
          }
        }
        return node;
      });
    };
  };
}

export function posthtmlExtractStyleDependencies(
  moduleData: ModuleData,
) {
  return (
    input: string,
    { importMap, use }: {
      importMap: Deno.ImportMap;
      use: postcss.AcceptedPlugin[];
    },
  ) => {
    const postcssPlugin = postcssExtractDependenciesPlugin(moduleData);
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
  moduleData: ModuleData,
) {
  return (
    input: string,
    { importMap, use }: {
      importMap: Deno.ImportMap;
      use: postcss.AcceptedPlugin[];
    },
  ) => {
    const postcssPlugin = postcssExtractDependenciesPlugin(moduleData);
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
