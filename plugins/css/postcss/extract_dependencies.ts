import { postcss, postcssValueParser } from "../../../deps.ts";
import { resolve as resolveDependency } from "../../../dependency/dependency.ts";
import { isURL } from "../../../_util.ts";
import { DependencyType, ModuleData } from "../../plugin.ts";

export function postcssExtractDependenciesPlugin(
  moduleData: ModuleData,
) {
  return (
    input: string,
    { importMap }: { importMap: Deno.ImportMap },
  ): postcss.AcceptedPlugin => {
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
          moduleData.dependencies[resolvedUrl] = {
            [DependencyType.Import]: {},
          };
        },
      },
      Declaration: (declaration) => {
        const params = postcssValueParser(declaration.value);
        for (const node of params.nodes) {
          if (node.type !== "function" || node.value !== "url") continue;
          const url = node.nodes[0].value;
          if (!url || isURL(url)) continue;
          const resolvedUrl = resolveDependency(input, url, importMap);
          moduleData.dependencies[resolvedUrl] = {
            [DependencyType.Import]: {},
          };
        }
      },
    };
  };
}

export async function extractDependencies(
  input: string,
  source: string,
  importMap: Deno.ImportMap,
) {
  const moduleData: ModuleData = { dependencies: {}, export: {} };
  const plugin = postcssExtractDependenciesPlugin(moduleData)(
    input,
    { importMap },
  );
  const processor = postcss.default([plugin]);
  await processor.process(source);
  return moduleData;
}
