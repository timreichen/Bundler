import type { ImportMap } from "../../deps.ts";
import { Loader, LoaderTest } from "../loader.ts";

export function jsonLoader(
  { test = (input: string) => input.endsWith(".json") }: {
    test?: LoaderTest;
  } = {},
) {

  return new Loader({
    test,
    fn: async (
      input: string,
      source: string,
      { importMap }: { importMap?: ImportMap } = {},
    ) => {
      return {
        imports: {},
        exports: {},
      };
    },
  });
}
