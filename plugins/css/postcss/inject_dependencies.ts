import { ImportMap, path, postcss, postcssValueParser } from "../../../deps.ts";
import { isURL } from "../../../_util.ts";
import { Chunk, DependencyFormat, DependencyType } from "../../plugin.ts";
import {
  createRelativeOutput,
  getChunk,
  getDependencyFormat,
  resolveDependency,
} from "../../_util.ts";

export function postcssInjectDependenciesPlugin(
  input: string,
  { root, chunks, importMap }: {
    root: string;
    chunks: Chunk[];
    importMap?: ImportMap;
  },
): postcss.AcceptedPlugin {
  return {
    postcssPlugin: "inject-dependencies",
    Once: (_root: postcss.Root) => {
      _root.walkAtRules((atRule) => {
        if (atRule.name !== "import") return;
        const params = postcssValueParser(atRule.params);
        const node = params.nodes[0];
        let url: string;
        if (node.type === "string") {
          url = node.value;
          if (!url || isURL(url)) return;
          const resolvedUrl = resolveDependency(input, url, importMap);
          const chunk = getChunk(
            chunks,
            resolvedUrl,
            DependencyType.ImportExport,
            DependencyFormat.Style,
          );
          node.value = createRelativeOutput(chunk.output, root);
        } else if (node.type === "function" && node.value === "url") {
          url = node.nodes[0].value;
          if (!url || isURL(url)) return;
          const resolvedUrl = resolveDependency(input, url, importMap);
          const chunk = getChunk(
            chunks,
            resolvedUrl,
            DependencyType.ImportExport,
            DependencyFormat.Style,
          );
          node.nodes[0].value = createRelativeOutput(chunk.output, root);
        } else {
          throw new Error(`unknown @import statement: ${atRule}`);
        }
        atRule.params = postcssValueParser.stringify(params.nodes);
      });
      _root.walkDecls((declaration) => {
        const params = postcssValueParser(declaration.value);
        for (const node of params.nodes) {
          if (node.type !== "function" || node.value !== "url") continue;
          const url = node.nodes[0].value;
          if (!url || isURL(url)) continue;
          const resolvedUrl = resolveDependency(input, url, importMap);

          const format = getDependencyFormat(resolvedUrl);
          if (!format) {
            throw new Error(
              `extension is not supported: ${path.extname(resolvedUrl)}`,
            );
          }
          const chunk = getChunk(
            chunks,
            resolvedUrl,
            DependencyType.ImportExport,
            format,
          );
          node.nodes[0].value = createRelativeOutput(chunk.output, root);
        }
        declaration.value = postcssValueParser.stringify(params.nodes);
      });
    },
  };
}

export async function injectDependencies(
  input: string,
  source: string,
  { root, chunks, importMap }: {
    root: string;
    chunks: Chunk[];
    importMap?: ImportMap;
  },
): Promise<string> {
  const plugin = postcssInjectDependenciesPlugin(input, {
    root,
    chunks,
    importMap,
  });
  const processor = postcss.default([plugin]);
  const { css } = await processor.process(source, { from: input });

  return css;
}
