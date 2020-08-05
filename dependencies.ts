import { dirname, isAbsolute, join, extname, posix } from "https://deno.land/std/path/mod.ts"
import { ts } from "./deps.ts"
import { fetchTextFile } from "./file.ts"
import {
  ImportMap,
  resolveWithImportMap,
} from "./import_map.ts"
import {
  traverse,
  getImportNode,
  getExportNode,
  getDynamicImportNode,
} from "./typescript.ts"
import { isURL, ensureExtension } from "./_helpers.ts"

export interface Dependency {
  path: string
  dynamic: boolean
}

/**
 * returns object of dependencies ```{ [relativePath]: resolvedPath }```
 */
export async function getDependencyMap(path: string): Promise<Dependency[]> {

  const source = await fetchTextFile(ensureExtension(path, ".ts"))

  const dependencies: Set<Dependency> = new Set()
  traverse(source, (node: ts.Node) => {
    // console.log(ts.SyntaxKind[node.kind])
    let moduleNode = getImportNode(node) || getExportNode(node) || getDynamicImportNode(node, source)
    const dynamicModuleImport = getDynamicImportNode(node, source)
    if (dynamicModuleImport) { moduleNode = dynamicModuleImport }

    if (moduleNode) {
      // ignore type imports (example: import type {MyInterface} from "./_interfaces.ts")
      if (node.importClause?.isTypeOnly) return node

      const relativePath = moduleNode.text

      dependencies.add({
        path: relativePath,
        dynamic: dynamicModuleImport !== undefined
      })
    }
    return node
  })

  return [...dependencies.values()]
}

/**
 * resolves relativePath relative to filePath
 */
export function resolve(
  path: string,
  relativePath: string,
  importMap: ImportMap = { imports: {} }
) {
  const importMapPath = resolveWithImportMap(relativePath, importMap)

  const isUrl = isURL(importMapPath)
  const parentIsUrl = isURL(path)

  let resolvedPath: string
  if (isUrl) {
    resolvedPath = importMapPath
  } else if (isAbsolute(importMapPath) || relativePath !== importMapPath) {
    if (parentIsUrl) {
      const fileUrl = new URL(path)
      fileUrl.pathname = importMapPath
      resolvedPath = fileUrl.href
    } else {
      resolvedPath = importMapPath
    }
  } else {
    if (parentIsUrl) {
      const fileUrl = new URL(filePath);
      // In a Windows system, this path has been joined as https://packager/\module@1.1\service
      // and the browser can't understand this kind of path
      fileUrl.pathname = posix.join(dirname(fileUrl.pathname), importMapPath);
      resolvedPath = fileUrl.href;
    } else {
      resolvedPath = join(dirname(path), importMapPath)
    }
  }
  return ensureExtension(resolvedPath, ".ts")
}
