import { postcss, postcssPresetEnv } from "../../deps.ts";

const presetEnvPlugin = postcssPresetEnv({
  stage: 2,
  features: { "nesting-rules": true },
}) as postcss.Plugin;

const processor = new postcss.Processor([presetEnvPlugin]);

export function parse(source: string) {
  return postcss.parse(source);
}
export function stringify(ast: postcss.Root) {
  return ast.toString();
  // let result = "";
  // postcss.stringify(ast, (part) => {
  //   result += part;
  // });
  // return result;
}
export async function transpile(ast: postcss.Root) {
  return await processor.process(ast).then((ast) => ast.root as postcss.Root);
}

function isContainer(node: postcss.Node): node is postcss.Container {
  return Object.hasOwn(node, "nodes");
}

export type Visitor<T = void | postcss.AnyNode> = (
  node: postcss.AnyNode,
) => Promise<T> | T;

export async function visitEachChild<T extends postcss.AnyNode>(
  node: T,
  visitor: Visitor,
) {
  if (isContainer(node)) {
    const newNodes: postcss.ChildNode[] = [];
    for (const child of node.nodes) {
      const newChild = await visitNode(child, visitor);
      if (newChild) newNodes.push(newChild);
    }
    node.nodes = newNodes;
  }
  return node;
}

export async function visitNode<T extends postcss.AnyNode>(
  node: T,
  visitor: Visitor,
): Promise<T> {
  return await visitor(node) as T;
}
