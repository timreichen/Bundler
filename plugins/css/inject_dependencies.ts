import { Bundler } from "../../bundler.ts";
import {
  colors,
  ImportMap,
  path,
  postcss,
  postcssValueParser,
} from "../../deps.ts";
import { isURL } from "../../_util.ts";
import {
  Chunk,
  createRelativeOutput,
  DependencyFormat,
  DependencyType,
  getChunk,
  getDependencyFormat,
  Item,
  resolveDependency,
} from "../_util.ts";
import { visitEachChild, visitNode, Visitor } from "./_util.ts";

export async function injectDependencies(
  input: string,
  ast: postcss.Root,
  dependencyItems: Item[],
  chunks: Chunk[],
  bundler: Bundler,
  { root = ".", importMap }: { root?: string; importMap?: ImportMap } = {},
) {
  const visitor: Visitor = async (node) => {
    switch (node.type) {
      case "atrule": {
        if (node.name === "import") {
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

          const resolvedUrl = resolveDependency(
            input,
            url,
            importMap,
          );

          // if @import should be replace with source code
          const dependencyItem = dependencyItems.find((
            dependencyItem,
          ) =>
            dependencyItem.input === resolvedUrl &&
            dependencyItem.type === DependencyType.ImportExport &&
            dependencyItem.format === DependencyFormat.Style
          );

          if (dependencyItem) {
            const { input, type, format } = dependencyItem;
            const dependencyAst = await bundler.createSource(
              input,
              type,
              format,
            );

            const injectedDependencyAst = await injectDependencies(
              input,
              dependencyAst,
              dependencyItems,
              chunks,
              bundler,
              { root, importMap },
            );

            bundler.logger.info(
              colors.yellow(`Inline`),
              input,
              colors.dim(type),
              colors.dim(format),
            );

            if (params.nodes.length > 1) {
              params.nodes.shift(); // remove first @import url param
              // if @import has media query, wrap source around @media node
              const mediaRule = postcss.atRule(
                {
                  name: "media",
                  params: postcssValueParser.stringify(params.nodes),
                  nodes: injectedDependencyAst.nodes,
                },
              );
              return mediaRule;
            } else {
              return injectedDependencyAst;
            }
          } else {
            const params = postcssValueParser(node.params);
            const param = params.nodes[0];
            let url: string;
            if (param.type === "string") {
              url = param.value;
              if (!url || isURL(url)) return;
              const resolvedUrl = resolveDependency(input, url, importMap);
              const chunk = getChunk(
                chunks,
                resolvedUrl,
                DependencyType.ImportExport,
                DependencyFormat.Style,
              );
              param.value = createRelativeOutput(chunk.output, root);
            } else if (param.type === "function" && param.value === "url") {
              url = param.nodes[0].value;
              if (!url || isURL(url)) return;
              const resolvedUrl = resolveDependency(input, url, importMap);
              const chunk = getChunk(
                chunks,
                resolvedUrl,
                DependencyType.ImportExport,
                DependencyFormat.Style,
              );
              param.nodes[0].value = createRelativeOutput(chunk.output, root);
            } else {
              throw new Error(`unknown @import statement: ${node}`);
            }
            node.params = postcssValueParser.stringify(params.nodes);

            bundler.logger.info(
              colors.yellow(`Import`),
              input,
              colors.dim(DependencyType.ImportExport),
              colors.dim(DependencyFormat.Style),
            );
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
        node.value = postcssValueParser.stringify(params.nodes);
        break;
      }
    }
    return await visitEachChild(node, visitor);
  };

  return await visitNode(ast, visitor);
}
