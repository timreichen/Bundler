// deno-lint-ignore-file no-explicit-any
import { setBase } from "../_util.ts";

export function posthtmlInjectBase(base: string) {
  return (tree: any) => {
    setBase(tree, base);
    return tree;
  };
}
