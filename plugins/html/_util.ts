// deno-lint-ignore-file no-explicit-any
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

export function setBase(tree: any, href: string) {
  const html = tree.find((item: any) =>
    item instanceof Object && item.tag === "html"
  );
  let head = html?.content.find((item: any) =>
    item instanceof Object && item.tag === "head"
  );
  if (!head) {
    head = { tag: "head" };
    html.content.push(head);
  }
  head.content ||= [];

  const index = head.content.findIndex((item: any) =>
    item instanceof Object && item.tag === "base"
  );
  const base = { tag: "base", attrs: { href } };
  if (index !== -1) {
    const baseItem = head.content.splice(index, 1);
    if (baseItem.attrs) {
      base.attrs = {
        ...baseItem.attrs,
        ...base.attrs,
      };
    }
  }

  head.content.unshift(base);
}
