// deno-lint-ignore-file no-explicit-any no-async-promise-executor require-await
import { Bundler } from "../../../bundler.ts";
import { ImportMap, postcss, postcssValueParser } from "../../../deps.ts";
import { Chunk, DependencyFormat, DependencyType } from "../../plugin.ts";
import { resolveDependency } from "../../_util.ts";

export function postcssInjectSourcesPlugin(
  chunk: Chunk,
  { bundler, chunks, importMap }: {
    bundler: Bundler;
    chunks: Chunk[];
    importMap?: ImportMap;
  },
): any {
  return (root: any) => {
    const promises: Promise<any>[] = [];
    // let importIndex = 0;
    root.walkAtRules(async (atRule: postcss.AtRule) => {
      if (atRule.name === "import") {
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

        const resolvedUrl = resolveDependency(
          chunk.item.input,
          url,
          importMap,
        );
        // if @import should be replace with source code
        const promise = new Promise(async (resolve) => {
          const processor = postcss.default([
            postcssInjectSourcesPlugin(chunk, {
              bundler,
              chunks,
            }),
          ]);
          const dependencyItem = chunk.dependencyItems.find((
            dependencyItem,
          ) =>
            dependencyItem.input === resolvedUrl &&
            dependencyItem.type === DependencyType.ImportExport &&
            dependencyItem.format === DependencyFormat.Style
          );
          if (!dependencyItem) {
            throw Error(`dependencyItem was not found:${resolvedUrl}`);
          }
          const { root: cssRoot } = await processor.process(
            dependencyItem.source,
            {
              from: resolvedUrl,
            },
          );

          if (params.nodes.length > 1) {
            params.nodes.shift(); // remove first @import url param
            // if @import has media query, wrap source around @media atRule
            const mediaRule = postcss.default.atRule(
              {
                name: "media",
                params: postcssValueParser.stringify(params.nodes),
                nodes: cssRoot.nodes,
              },
            );
            atRule.replaceWith(mediaRule);
          } else {
            atRule.replaceWith(...cssRoot.nodes);
          }
          resolve(undefined);
        });
        promises.push(promise);
      }
    });
    return Promise.all(promises);
  };
}
export async function injectSources(
  chunk: Chunk,
  source: string,
  { chunks, bundler }: {
    chunks: Chunk[];
    bundler: Bundler;
  },
): Promise<string> {
  const plugin = postcssInjectSourcesPlugin(chunk, { bundler, chunks });
  const processor = postcss.default([plugin]);
  const { css } = await processor.process(source, { from: chunk.item.input });
  return css;
}
