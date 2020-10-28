import { ImportMap } from "../../deps.ts";
import { Loader, LoaderTest } from "../loader.ts";
import { getImportExports } from "../../_import_export.ts";

export function typescriptLoader(
  { test = (input: string) => /\.(tsx?|jsx?)$/.test(input) }: {
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
      const { imports, exports } = getImportExports(
        input,
        source,
        { importMap, resolve: true },
      );

      return {
        imports,
        exports,
      };
    },
  });
}
