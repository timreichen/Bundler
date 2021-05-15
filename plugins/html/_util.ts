import { path } from "../../deps.ts";
import { isURL } from "../../_util.ts";

/**
 * returns base href if <base> tag exists in html header.
 * @param tree
 */
export function getBase(tree: any) {
  const html = tree.find((item: any) =>
    item instanceof Object && item.tag === "html"
  );
  const head = html?.content.find((item: any) =>
    item instanceof Object && item.tag === "head"
  );
  const base = head?.content.find((item: any) =>
    item instanceof Object && item.tag === "base"
  );
  return base?.attrs?.href || ".";
}

export function resolveBase(url: string, base: string) {
  if (url && !isURL(url) && !path.isAbsolute(url)) {
    url = path.join(base, url);
  }
  return url;
}
