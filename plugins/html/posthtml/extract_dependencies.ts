import { Imports, resolve as resolveDependency } from "../../../dependency.ts";
import { ImportMap } from "../../../deps.ts";
import { isURL } from "../../../_util.ts";

export function posthtmlExtractImageUrl(
  input: string,
  imports: Imports,
  { importMap }: { importMap?: ImportMap },
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

export function posthtmlExtractLinkUrl(
  input: string,
  imports: Imports,
  { importMap }: { importMap?: ImportMap },
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

export function posthtmlExtractScriptUrl(
  input: string,
  imports: Imports,
  { importMap }: { importMap?: ImportMap },
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
