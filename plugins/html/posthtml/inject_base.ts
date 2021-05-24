import { setBase } from "../_util.ts";

export function posthtmlInjectBase(base: string) {
  return async (tree: any) => {
    setBase(tree, base);
    return tree;
  };
}
