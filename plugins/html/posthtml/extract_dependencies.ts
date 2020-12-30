import { Imports, resolve as resolveDependency } from "../../../dependency.ts";
import { ImportMap } from "../../../deps.ts";
import { isURL } from "../../../_util.ts";
import { postcss } from "../../../deps.ts";
import { postcssExtractDependenciesPlugin } from "../../css/postcss_plugins/extract_dependencies.ts";
import { walkAll } from "./_utils.ts";

export function posthtmlExtractImageImports(
  input: string,
  imports: Imports,
  { importMap }: { importMap: ImportMap },
) {
  return (tree: any) => {
    tree.match({ tag: "img" }, (node: any) => {
      const src = node.attrs?.src;
      if (src && !isURL(src)) {
        const resolvedUrl = resolveDependency(
          input,
          src,
          importMap,
        );
        imports[resolvedUrl] = {
          specifiers: ["default"],
          type: "image",
        };
      }
      return node;
    });
  };
}

export function posthtmlExtractLinkImports(
  input: string,
  imports: Imports,
  { importMap }: { importMap: ImportMap },
) {
  return (tree: any) => {
    tree.match({ tag: "link" }, (node: any) => {
      const href = node.attrs?.href;
      if (href && !isURL(href)) {
        const resolvedUrl = resolveDependency(
          input,
          href,
          importMap,
        );
        const rel = node.attrs?.rel;
        let type: string;

        switch (rel) {
          case "stylesheet":
            type = "style";
            break;
          case "manifest":
            type = "webmanifest";
            break;
          case "icon":
            type = "image";
            break;
          default:
            throw new Error(`rel not supported: ${rel}`);
        }
        imports[resolvedUrl] = {
          specifiers: ["default"],
          type,
        };
      }
      return node;
    });
  };
}

export function posthtmlExtractScriptImports(
  input: string,
  imports: Imports,
  { importMap }: { importMap: ImportMap },
) {
  return (tree: any) => {
    tree.match({ tag: "script" }, (node: any) => {
      const src = node.attrs?.src;
      if (src && !isURL(src)) {
        const resolvedUrl = resolveDependency(
          input,
          src,
          importMap,
        );
        imports[resolvedUrl] = {
          specifiers: ["default"],
          type: "script",
        };
      }
      return node;
    });
  };
}

export function posthtmlExtractStyleImports(
  input: string,
  imports: Imports,
  { importMap, use }: { importMap: ImportMap; use: postcss.AcceptedPlugin[] },
) {
  const postcssPlugin = postcssExtractDependenciesPlugin({ imports });
  const processor = postcss.default([
    ...use,
    postcssPlugin(input, { importMap }),
  ]);
  const promises: Promise<any>[] = [];
  return (tree: any) => {
    return new Promise(async (resolve) => {
      tree.match({ tag: "style" }, async (node: any) => {
        promises.push(processor.process(node.content));
        return node;
      });
      await Promise.all(promises);
      return resolve(tree);
    });
  };
}

export function posthtmlExtractInlineStyleImports(
  input: string,
  imports: Imports,
  { importMap, use }: { importMap: ImportMap; use: postcss.AcceptedPlugin[] },
) {
  const postcssPlugin = postcssExtractDependenciesPlugin({ imports });
  const processor = postcss.default([
    ...use,
    postcssPlugin(input, { importMap }),
  ]);
  const promises: Promise<any>[] = [];
  return (tree: any) => {
    return new Promise(async (resolve) => {
      tree.walk((node: any) => {
        return walkAll(node, (node) => {
          const style = node.attrs?.style;
          if (style) {
            promises.push(processor.process(style));
          }
        });
      });
      await Promise.all(promises);
      return resolve(tree);
    });
  };
}
