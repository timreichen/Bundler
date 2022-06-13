import { ImportMap, postcss, postcssValueParser } from "../../../deps.ts";
import { isURL } from "../../../_util.ts";
import { Dependency, DependencyData, DependencyType } from "../../plugin.ts";
import { getDependencyFormat, resolveDependency } from "../../_util.ts";

export function postcssExtractDependenciesPlugin(dependencies: Dependency[]) {
  return (
    input: string,
    { importMap }: { importMap?: ImportMap },
  ): postcss.Plugin => {
    return {
      postcssPlugin: "extract-dependencies",
      AtRule: {
        import: (atRule) => {
          const params = postcssValueParser(atRule.params);
          const node = params.nodes[0];
          let url: string;
          if (node.type === "string") {
            url = node.value;
          } else if (node.type === "function" && node.value === "url") {
            url = node.nodes[0].value;
          } else {
            throw new Error(`unknown @import statement: ${atRule}`);
          }
          if (!url || isURL(url)) return;
          const resolvedUrl = resolveDependency(input, url, importMap);
          const format = getDependencyFormat(url);
          if (!format) {
            throw new Error(`no format found: ${url}`);
          }
          dependencies.push({
            input: resolvedUrl,
            format,
            type: DependencyType.ImportExport,
          });
        },
      },
      Declaration: (declaration) => {
        const params = postcssValueParser(declaration.value);
        for (const node of params.nodes) {
          if (node.type !== "function" || node.value !== "url") continue;
          const url = node.nodes[0].value;
          if (!url || isURL(url)) continue;
          const resolvedUrl = resolveDependency(input, url, importMap);
          const format = getDependencyFormat(url);
          if (!format) {
            throw new Error(`no format found: ${url}`);
          }
          dependencies.push({
            input: resolvedUrl,
            format,
            type: DependencyType.ImportExport,
          });
        }
      },
    };
  };
}

export async function extractDependencies(
  input: string,
  source: string,
  importMap?: ImportMap,
): Promise<DependencyData> {
  const dependencies: Dependency[] = [];
  const plugin = postcssExtractDependenciesPlugin(dependencies)(
    input,
    { importMap },
  );
  const processor = postcss.default([plugin]);
  await processor.process(source, { from: input });
  return {
    dependencies,
    exports: {},
  };
}
