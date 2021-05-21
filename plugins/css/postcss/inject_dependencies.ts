import { path, postcss, postcssValueParser } from "../../../deps.ts";
import {
  addRelativePrefix,
  isURL,
  removeRelativePrefix,
} from "../../../_util.ts";
import { resolve as resolveDependency } from "../../../dependency.ts";
import { getAsset, Graph } from "../../../graph.ts";
import { DependencyType } from "../../plugin.ts";

export const postcssInjectDependenciesPlugin = (
  bundleInput: string,
  bundleOutput: string,
  { graph, outDirPath }: { graph: Graph; outDirPath: string },
): any => {
  const bundleDirPath = path.dirname(bundleOutput);
  return (root: any) => {
    root.walkDecls((declaration: postcss.Declaration) => {
      const params = postcssValueParser(declaration.value);
      for (const node of params.nodes) {
        if (node.type !== "function" || node.value !== "url") continue;
        const url = node.nodes[0].value;
        if (!url || isURL(url)) continue;
        const resolvedUrl = resolveDependency(bundleInput, url);

        const asset = getAsset(graph, resolvedUrl, DependencyType.Import);
        const relativeOutput = addRelativePrefix(
          path.relative(bundleDirPath, asset.output),
        );

        node.nodes[0].value = relativeOutput;
        declaration.value = params;
      }
    });
  };
};
