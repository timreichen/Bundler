import { yellow } from "https://deno.land/std/fmt/colors.ts";
import { dirname, isAbsolute, join } from "https://deno.land/std/path/mod.ts";
import { ts } from "./deps.ts";
import { fetchTextFile } from "./file.ts";
import {
  ImportMap,
  resolveWithImportMap,
} from "./import_map.ts";
import {
  traverse,
  getImportNode,
  getExportNode,
  getDynamicImportNode,
} from "./typescript.ts";
import { isURL } from "./_helpers.ts";

export interface DependencyMap {
  [path: string]: string;
}

/**
 * returns array of all import and exports
 */
export async function getDependencies(filePath: string): Promise<string[]> {
  const source = await fetchTextFile(filePath);

  const dependencies: Set<string> = new Set();
  traverse(source, (node: ts.Node) => {
    // console.log(ts.SyntaxKind[node.kind])
    const moduleNode = getImportNode(node) ||
      getDynamicImportNode(node, source) || getExportNode(node);
    if (moduleNode) {
      // ignore type imports (example: import type {MyInterface} from "./_interfaces.ts")
      if (node.importClause?.isTypeOnly) return node;

      const relativePath = moduleNode.text;

      dependencies.add(relativePath);
    }
    return node;
  });

  return [...dependencies.values()];
}

/**
 * resolves relativePath relative to filePath
 */
export function resolveDependencyPath(
  filePath: string,
  relativePath: string,
  { importMap = { imports: {} } }: { root?: string; importMap?: ImportMap } =
    {},
) {
  const importMapPath = resolveWithImportMap(relativePath, importMap);

  const isUrl = isURL(importMapPath);
  const parentIsUrl = isURL(filePath);

  let resolvedPath: string;
  if (isUrl) {
    resolvedPath = importMapPath;
  } else if (isAbsolute(importMapPath) || relativePath !== importMapPath) {
    if (parentIsUrl) {
      const fileUrl = new URL(filePath);
      fileUrl.pathname = importMapPath;
      resolvedPath = fileUrl.href;
    } else {
      resolvedPath = importMapPath;
    }
  } else {
    if (parentIsUrl) {
      const fileUrl = new URL(filePath);
      fileUrl.pathname = join(dirname(fileUrl.pathname), importMapPath);
      resolvedPath = fileUrl.href;
    } else {
      resolvedPath = join(dirname(filePath), importMapPath);
    }
  }
  return resolvedPath;
}
