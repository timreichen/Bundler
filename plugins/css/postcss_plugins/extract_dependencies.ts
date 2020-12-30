import { Imports } from "../../../dependency.ts";
import { ImportMap, postcss } from "../../../deps.ts";
import { resolve as resolveDependency } from "../../../dependency.ts";
import { stripCssUrlSpecifier } from "../_utils.ts";
import { isURL } from "../../../_util.ts";

export const postcssExtractDependenciesPlugin = (
  { imports }: { imports: Imports },
) =>
  (
    filePath: string,
    { importMap }: { importMap: ImportMap },
  ): postcss.AcceptedPlugin => {
    return {
      postcssPlugin: "extract-dependencies",
      AtRule: {
        import: (atRule) => {
          const url: string = stripCssUrlSpecifier(atRule.params); // remove brackets and quotes
          if (isURL(url)) return;
          const resolvedUrl = resolveDependency(filePath, url, importMap);
          imports[resolvedUrl] = { specifiers: ["default"], type: "style" };
        },
      },
      Declaration: (declaration) => {
        for (const [match] of declaration.value.matchAll(/url\([^\)]+\)/g)) {
          const url = stripCssUrlSpecifier(match);
          if (isURL(url)) continue;
          const resolvedUrl = resolveDependency(filePath, url, importMap);
          imports[resolvedUrl] = { specifiers: ["default"], type: "style" };
        }
      },
    };
  };
