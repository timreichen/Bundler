// deno-lint-ignore-file no-explicit-any no-async-promise-executor require-await
import { postcss, postcssValueParser } from "../../../deps.ts";
import { resolve as resolveDependency } from "../../../dependency/dependency.ts";
import { Context, DependencyType, Item } from "../../plugin.ts";

export function postcssInjectImportsPlugin(
  item: Item,
  context: Context,
  use: postcss.AcceptedPlugin[],
): any {
  const { bundler, importMap } = context;
  const input = item.history[0];

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
        // const ruleIndex = atRule.parent?.index(atRule);

        // // if @import should stay
        // if (
        //   chunks.find((chunk) => {
        //     const item = chunk.item;
        //     item.history[0] === resolvedUrl &&
        //       item.type === DependencyType.Import;
        //   }) &&
        //   ruleIndex !== undefined &&
        //   ruleIndex <= importIndex
        // ) {
        //   importIndex = ruleIndex + 1;

        //   const asset = getAsset(graph, resolvedUrl, DependencyType.Import);

        //   const resolvedOutput = path.relative(
        //     path.dirname(parentAsset.output),
        //     asset.output,
        //   );

        //   valueNode.value = resolvedOutput;
        //   atRule.params = params;
        // } else {
        // if @import should be replace with source code
        const promise = new Promise(async (resolve) => {
          const newItem: Item = {
            history: [resolvedUrl, ...item.history],
            type: DependencyType.Import,
          };
          const source = await bundler.readSource(
            newItem,
            context,
          );

          const processor = postcss.default([
            ...use,
            postcssInjectImportsPlugin(newItem, context, use),
          ]);

          const { root } = await processor.process(
            source as string,
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
        // }
      }
    });
    return Promise.all(promises);
  };
}
