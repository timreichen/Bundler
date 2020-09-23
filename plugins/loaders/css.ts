import postcssCore from "https://jspm.dev/postcss";
import postcssPresetEnv from "https://jspm.dev/postcss-preset-env";
import {
  resolve as resolveDependencySpecifier,
} from "../../dependencies.ts";
import type { ImportMap } from "../../deps.ts";
import type { Imports } from "../../graph.ts";
import { Loader, LoaderTest } from "../loader.ts";

function stripImportSpecifier(specifier: string) {
  if (specifier.startsWith(`url(`) && specifier.endsWith(`)`)) {
    // remove round brackets and quotes from specifier ("foo/bar.css") -> foo/bar.css
    specifier = specifier.substring(4, specifier.length - 1);
  }
  if (
    (specifier.startsWith(`"`) && specifier.endsWith(`"`)) ||
    (specifier.startsWith(`'`) && specifier.endsWith(`'`))
  ) {
    // remove quotes from specifier "foo/bar.css" -> foo/bar.css
    specifier = specifier.substring(1, specifier.length - 1);
  }
  return specifier;
}

export function cssLoader(
  { test = (input: string) => input.endsWith(".css"), use = [] }: {
    test?: LoaderTest;
    use?: unknown[];
  } = {},
) {
  const postcss = (postcssCore as Function)(use);

  return new Loader({
    test,
    fn: async (
      input: string,
      source: string,
      { importMap }: { importMap?: ImportMap } = {},
    ) => {
      const { root } = await postcss.process(source, { from: input });
      const imports: Imports = {};

      // extract imports
      root.walkAtRules("import", (rule: { params: string }) => {
        const url: string = stripImportSpecifier(rule.params); // remove brackets and quotes
        const resolvedUrl = resolveDependencySpecifier(input, url, importMap);
        imports[resolvedUrl] = {
          dynamic: false,
        };
      });

      return {
        imports,
        exports: {},
      };
    },
  });
}
