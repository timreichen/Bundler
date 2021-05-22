import { setBase } from "../_util.ts";

export function posthtmlInjectBase(
  { outDirPath }: {
    outDirPath: string;
  },
) {
  return async (tree: any) => {
    setBase(tree, "/");
    return tree;
  };
}
