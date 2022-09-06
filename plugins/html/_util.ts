import { path } from "../../deps.ts";
import { isURL } from "../../_util.ts";

import { html } from "../../deps.ts";

/**
 * returns base href if <base> tag exists in html header.
 * @param element
 */
export function getBase(element: html.Element) {
  const head = element.querySelector("head");
  const base = head?.querySelector("base");
  return base?.getAttribute("href") ?? ".";
}

export function resolveBase(url: string, base: string) {
  if (url && !isURL(url) && !path.isAbsolute(url)) {
    url = path.join(base, url);
  }
  return url;
}

export function setBase(element: html.Element, href: string) {
  const head = element.querySelector("head");
  const base = head?.querySelector("base");
  // if (!base) {
  //   base = document.createElement("base");
  //   head?.appendChild(base);
  // }
  base?.setAttribute("href", href);
  return base;
}

export function parse(source: string): html.Element {
  const document = new html.DOMParser().parseFromString(source, "text/html");
  if (!document) throw Error(`document is undefined`);
  if (!document.documentElement) {
    throw Error(`document does not have a documentElement`);
  }
  return document.documentElement;
}
export function stringify(element: html.Element) {
  return "<!DOCTYPE html>" + element.outerHTML;
}

export type Visitor = (
  node: html.Element,
) => Promise<html.Element | void> | html.Element | void;

export async function visitEachChild<T extends html.Element>(
  node: T,
  visitor: Visitor,
): Promise<T | void> {
  if (node.children) {
    for (const child of node.children) {
      const newChild = await visitNode(child, visitor);
      if (newChild) {
        node.insertBefore(newChild, child);
        node.removeChild(child);
        // node.replaceChild(newChild, child);
      } else {
        node.removeChild(child);
      }
    }
  }
  return node;
}
export async function visitNode<T extends html.Element>(
  element: T,
  visitor: Visitor,
): Promise<T> {
  element = element.cloneNode(true) as T;
  return await visitor(element) as T;
}
