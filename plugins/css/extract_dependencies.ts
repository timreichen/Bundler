import { ImportMap, postcss, postcssValueParser } from "../../deps.ts";
import { isURL } from "../../_util.ts";
import {
  DependencyType,
  getDependencyFormat,
  Item,
  resolveDependency,
} from "../_util.ts";
import { visitEachChild, visitNode, Visitor } from "./_util.ts";

export async function extractDependencies(
  input: string,
  ast: postcss.Root,
  { importMap }: { importMap?: ImportMap } = {},
) {
  const dependencies: Item[] = [];

  const visitor: Visitor = async (node) => {
    switch (node.type) {
      case "atrule": {
        switch (node.name) {
          case "import": {
            const params = postcssValueParser(node.params);
            const param = params.nodes[0];
            let url: string;
            if (param.type === "string") {
              url = param.value;
            } else if (param.type === "function" && param.value === "url") {
              url = param.nodes[0].value;
            } else {
              throw new Error(`unknown @import statement: ${node}`);
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
            break;
          }
        }
        break;
      }
      case "decl": {
        const params = postcssValueParser(node.value);
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
        break;
      }
    }
    return await visitEachChild(node, visitor);
  };

  await visitNode(ast, visitor);

  return dependencies;
}
