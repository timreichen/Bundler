import { path, posthtmlParser, posthtmlRender } from "../../deps.ts";
import { isURL } from "../../_util.ts";
import { posthtml } from "../../deps.ts";

function findChild(content: posthtml.Content | undefined, tag: string) {
  if (!Array.isArray(content)) return;
  for (let nodes of content) {
    if (!Array.isArray(nodes)) {
      nodes = [nodes];
    }
    for (const node of nodes) {
      if (node instanceof Object && node.tag === tag) return node;
    }
  }
}

/**
 * returns base href if <base> tag exists in html header.
 * @param ast
 */
export function getBase(ast: posthtml.Node[]) {
  const html = findChild(ast, "html");
  const htmlContent = html?.content;
  const head = findChild(htmlContent, "head");
  const headContent = head?.content;
  const base = findChild(headContent, "base");
  return String(base?.attrs?.href ?? ".");
}

export function resolveBase(url: string, base: string) {
  if (url && !isURL(url) && !path.isAbsolute(url)) {
    url = path.join(base, url);
  }
  return url;
}

export function setBase(ast: posthtml.Node[], href: string) {
  const html = findChild(ast, "html");
  const htmlContent = html?.content;
  const head = findChild(htmlContent, "head");
  const headContent = head?.content;
  let base = findChild(headContent, "base");
  if (!base) {
    base = { tag: "base", attrs: {} };
    if (!Array.isArray(headContent)) {
      throw Error(`head does not have child nodes`);
    }
    headContent.unshift(base);
  }
  base.attrs ||= {};
  base.attrs.href = href;
}

export function parse(source: string) {
  return posthtmlParser(source);
}
export function stringify(ast: posthtml.Node[]) {
  return posthtmlRender(ast);
}

function isNodeTag(node: posthtml.Node): node is posthtml.NodeTag {
  return node instanceof Object;
}
interface NodeTagWithChildren extends posthtml.NodeTag {
  tag: posthtml.Tag;
  attrs: posthtml.Attributes;
  content: Array<posthtml.Node | posthtml.Node[]>;
}
function hasChildren(
  node: posthtml.NodeTag,
): node is NodeTagWithChildren {
  return Array.isArray(node.content);
}
export type Visitor = (
  node: posthtml.NodeTag,
) => Promise<posthtml.NodeTag | void> | posthtml.NodeTag | void;

export async function visitEachChild<T extends posthtml.NodeTag>(
  node: T,
  visitor: Visitor,
): Promise<T | void> {
  if (isNodeTag(node) && hasChildren(node)) {
    const newContent: posthtml.Content = [];
    for (const content of node.content) {
      if (Array.isArray(content)) {
        const newChildContent: posthtml.NodeTag[] = [];
        for (const child of content) {
          if (isNodeTag(child)) {
            const newNode = await visitNode(child, visitor);
            if (newNode) newChildContent.push(newNode);
          } else {
            newContent.push(child);
          }
        }
        newContent.push(newChildContent);
      } else {
        if (isNodeTag(content)) {
          const newNode = await visitNode(content, visitor);
          if (newNode) newContent.push(newNode);
        } else {
          newContent.push(content);
        }
      }
    }
    node.content = newContent;
  }
  return node;
}
export async function visitNode<T extends posthtml.NodeTag>(
  node: T,
  visitor: Visitor,
) {
  return await visitor(node);
}

export async function visitNodes<T extends posthtml.Node[]>(
  nodes: T,
  visitor: Visitor,
): Promise<T> {
  const newNodes: posthtml.NodeTag[] = [];
  for (const node of nodes) {
    if (isNodeTag(node)) {
      const newNode = await visitNode(node, visitor);
      if (newNode) newNodes.push(newNode);
    }
  }
  return newNodes as T;
}
