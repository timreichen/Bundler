import { path, postcss } from "../../../deps.ts";
import { addRelativePrefix, isURL } from "../../../_util.ts";
import { resolve as resolveDependency } from "../../../dependency.ts";
import { Bundler } from "../../../bundler.ts";
import { stripCssUrlSpecifier } from "../_utils.ts";
import { Graph } from "../../../graph.ts";

export const postcssInjectOutputsPlugin = (
  filePath: string,
  bundleInput: string,
  graph: Graph,
  bundler: Bundler,
): postcss.AcceptedPlugin => {
  const bundleOutput = path.dirname(graph[bundleInput].output);

  return (css: any) => {
    // css.walkAtRules((node: postcss.AtRule) => {
    //   const url: string = stripCssUrlSpecifier(node.params); // remove brackets and quotes
    //   const resolvedUrl = resolveDependency(filePath, url, bundler.importMap);
    //   const { output: outputFilePath } = graph[resolvedUrl];
    //   const relativeOutputFilePath = addRelativePrefix(
    //     path.relative(bundleOutput, outputFilePath),
    //   );
    //   node.params = `url("${relativeOutputFilePath}");`
    // });
    css.walkDecls((node: postcss.Declaration) => {
      const value = node.value;
      let index = 0;
      const regex = /url\([^\)]+?\)/g;
      let match;

      while (match = regex.exec(value)) {
        const matchValue = match[0];
        const url = stripCssUrlSpecifier(matchValue);
        if (isURL(url)) continue;
        const resolvedUrl = resolveDependency(filePath, url, bundler.importMap);
        const { output: outputFilePath } = graph[resolvedUrl];
        const relativeOutputFilePath = addRelativePrefix(
          path.relative(bundleOutput, outputFilePath),
        );

        node.value = `${value.substring(index, match.index)}${
          matchValue.replace(url, relativeOutputFilePath)
        }`;
        index = match.index + matchValue.length;
      }
    });
  };
};
