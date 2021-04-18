import { path, postcss, postcssValueParser } from "../../../deps.ts";
import { resolve as resolveDependency } from "../../../dependency.ts";
import { addRelativePrefix } from "../../../_util.ts";
import { Chunk, Context, DependencyType, Format, Item } from "../../plugin.ts";
import { getAsset } from "../../../graph.ts";

export function postcssInjectImportsPlugin(
  chunk: Chunk,
  context: Context,
  use: postcss.AcceptedPlugin[],
): any {
  const { bundler, graph, importMap, chunks } = context;
  const processor = postcss.default(use);
  const input = chunk.history[0];

  const parentAsset = getAsset(graph, input, chunk.type);
  return (root: any) => {
    const promises: Promise<any>[] = [];
    let importIndex = 0;
    root.walkAtRules(async (atRule: postcss.AtRule) => {
      if (atRule.name === "import") {
        let valueNode;
        const params = postcssValueParser(atRule.params);
        const node = params.nodes[0];
        let url: string;
        if (node.type === "string") {
          valueNode = node;
          url = node.value;
        } else if (node.type === "function" && node.value === "url") {
          valueNode = node.nodes[0];
          url = node.nodes[0].value;
        } else {
          throw Error(`unknown @import statement: ${atRule}`);
        }

        const resolvedUrl = resolveDependency(
          input,
          url,
          importMap,
        );
        // http://www.w3.org/TR/CSS21/cascade.html#at-import
        // any @import rules must precede all other rules.
        // therefore rules between @import rules are impossible.
        /* not possible:
          @import "a.css";
          h1 { color: blue }
          @import "b.css";
        */

        /* example
          @import "a.css";
          @import "b.css";
          */
        // If "a.css" is a chunk and "b.css" is not a chunk, "a.css" can be imported via @import while "b.css" can be inlined.
        // If "a.css" is a not a chunk and "b.css" is a chunk, both must be inlined. to avoid an @import rule after other rules.
        const ruleIndex = atRule.parent?.index(atRule);

        // // if @import should stay
        if (
          chunks.find((chunk) =>
            chunk.history[0] === resolvedUrl &&
            chunk.type === DependencyType.Import
          ) &&
          ruleIndex !== undefined &&
          ruleIndex <= importIndex
        ) {
          importIndex = ruleIndex + 1;

          const asset = getAsset(graph, resolvedUrl, DependencyType.Import);

          const resolvedOutput = addRelativePrefix(
            path.relative(path.dirname(parentAsset.output), asset.output),
          );

          valueNode.value = resolvedOutput;
          atRule.params = params;
        } else {
          // if @import should be replace with source code
          const promise = new Promise(async (resolve) => {
            const item: Item = {
              history: [resolvedUrl, ...chunk.history],
              type: DependencyType.Import,
              format: Format.Style,
            };
            const source = await bundler.readSource(
              item,
              context,
            );

            let { root } = await processor.process(
              source,
              { from: resolvedUrl },
            );

            if (params.nodes.length > 1) {
              params.nodes.shift(); // remove first @import url param
              // if @import has media query, wrap source around @media atRule
              const mediaRule = postcss.default.atRule(
                {
                  name: "media",
                  params: params,
                  nodes: root.nodes,
                },
              );
              atRule.replaceWith(mediaRule);
            } else {
              atRule.replaceWith(...root.nodes);
            }
            resolve(undefined);
          });
          promises.push(promise);
        }
      }
    });
    return Promise.all(promises);
  };
}
