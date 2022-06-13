import { path, posthtml } from "../../deps.ts";
import { isURL } from "../../_util.ts";

/**
 * returns base href if <base> tag exists in html header.
 * @param tree
 */
export function getBase(tree: posthtml.RawNode[]) {
  const html = tree.find((item) =>
    item instanceof Object && item.tag === "html"
  );
  const head = html?.content?.find((item) =>
    item instanceof Object && item.tag === "head"
  ) as posthtml.RawNode;
  const base = head?.content?.find((item) =>
    item instanceof Object && item.tag === "base"
  ) as posthtml.RawNode;
  return base?.attrs?.href || ".";
}

export function resolveBase(url: string, base: string) {
  if (url && !isURL(url) && !path.isAbsolute(url)) {
    url = path.join(base, url);
  }
  return url;
}

export function setBase(tree: posthtml.RawNode[], href: string) {
  const html = tree.find((item) =>
    item instanceof Object && item.tag === "html"
  ) as posthtml.RawNode;
  let head = html?.content?.find((item) =>
    item instanceof Object && item.tag === "head"
  ) as posthtml.RawNode;

  if (!head) {
    head = { tag: "head", attrs: {} };
    html.content?.push(head);
  }
  head.content ||= [];

  const index = head.content?.findIndex((item) =>
    item instanceof Object && item.tag === "base"
  );
  const base = { tag: "base", attrs: { href } };
  if (index !== -1) {
    const baseItem = head.content.splice(index, 1)[0] as posthtml.RawNode;
    if (baseItem.attrs) {
      base.attrs = {
        ...baseItem.attrs,
        ...base.attrs,
      };
    }
  }
  head.content.unshift(base);
}
