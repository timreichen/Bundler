import {
  dirname,
  isAbsolute,
  join,
  posix,
} from "https://deno.land/std/path/mod.ts";
import { ts } from "./deps.ts";
import {
  resolve as resolveWithImportMap,
  ImportMap,
} from "https://deno.land/x/importmap@0.1.4/mod.ts";
import {
  traverse,
  getImportNode,
  getExportNode,
  getDynamicImportNode,
} from "./typescript.ts";
import { isURL, ensureExtension } from "./_helpers.ts";

/**
 * returns array of dependencies
 */
export async function getDependencies(source: string): Promise<string[]> {
  const dependencies: Set<string> = new Set();
  traverse(source, (node: ts.Node) => {
    // console.log(ts.SyntaxKind[node.kind])
    let moduleNode = getImportNode(node) || getExportNode(node) ||
      getDynamicImportNode(node, source);
    const dynamicModuleImport = getDynamicImportNode(node, source);
    if (dynamicModuleImport) moduleNode = dynamicModuleImport;

    if (moduleNode) {
      // ignore type imports (example: import type {MyInterface} from "./_interfaces.ts")
      if (node.importClause?.isTypeOnly) return node;

      const specifier = moduleNode.text;

      dependencies.add(specifier);
    }
    return node;
  });

  return [...dependencies.values()];
}

/**
 * resolves specifier relative to filePath
 */
export function resolve(
  path: string,
  specifier: string,
  importMap: ImportMap = { imports: {}, scopes: {} },
) {
  const resolvedImportPath = resolveWithImportMap(
    specifier,
    importMap,
    path,
  );

  const isUrl = isURL(resolvedImportPath);
  const parentIsUrl = isURL(path);

  let resolvedPath: string;
  if (isUrl) {
    resolvedPath = resolvedImportPath;
  } else if (
    isAbsolute(resolvedImportPath) || specifier !== resolvedImportPath
  ) {
    if (parentIsUrl) {
      const fileUrl = new URL(path);
      fileUrl.pathname = resolvedImportPath;
      resolvedPath = fileUrl.href;
    } else {
      resolvedPath = resolvedImportPath;
    }
  } else {
    if (parentIsUrl) {
      const fileUrl = new URL(path);
      // In a Windows system, this path has been joined as https://packager/\module@1.1\service
      // and the browser can't understand this kind of path
      fileUrl.pathname = posix.join(dirname(fileUrl.pathname));
      resolvedPath = fileUrl.href;
    } else {
      resolvedPath = join(dirname(path), resolvedImportPath);
    }
  }
  // console.table({
  //   path,
  //   specifier,
  //   resolvedImportPath,
  //   resolvedPath
  // })

  return ensureExtension(resolvedPath, ".ts");
}
