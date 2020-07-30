import { join, dirname, isAbsolute } from "https://deno.land/std/path/mod.ts"
import { ImportMap, resolveWithImportMap } from "../../Desktop/bundler/import_map.ts"
import { ts } from "./deps.ts"
import { fetchTextFile } from "./file.ts"
import { yellow } from "https://deno.land/std/fmt/colors.ts"
import { traverseTextFile } from "./typescript.ts"
import { isURL } from "./_helpers.ts"

export interface DependencyMap {
  [path: string]: string
}

/**
 * returns array of all import and exports
 */
export async function getDependencies(filePath: string): Promise<string[]> {
  
  const source = await fetchTextFile(filePath)

  function getImportModuleNode(node: ts.node, source: string) {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier) { return node.moduleSpecifier }
    // dynamic imports: create dep if fist argument is string literal: import("test.ts") -> "test.ts"
    if (ts.SyntaxKind[node.kind] === "CallExpression" && ts.SyntaxKind[node.expression.kind] === "ImportKeyword") {
      const arg = node.arguments[0]
      if (!ts.isStringLiteral(arg)) {
        console.warn(yellow("Warning"), `dynamic import argument is not a string literal: Cannot resolve ${yellow(`import(${source.substring(arg.pos, node.arguments[node.arguments.length - 1].end)})`)} at index ${arg.pos}`)
        return
      }
      return arg
    }
  }
  function getExportModuleNode(node: ts.node) {
    if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      return node.moduleSpecifier
    }
  }

  const dependencies: Set<string> = new Set()
  traverseTextFile(source, {}, (node: ts.Node) => {
    // console.log(ts.SyntaxKind[node.kind])
    const moduleNode = getImportModuleNode(node, source) || getExportModuleNode(node)
    if (moduleNode) {
      // ignore type imports (example: import type {MyInterface} from "./_interfaces.ts")
      if (node.importClause?.isTypeOnly) { return node }

      const relativePath = moduleNode.text

      dependencies.add(relativePath)
    }
    return node
  })

  return [...dependencies.values()]
}

/**
 * resolves relativePath relative to filePath
 */
export function resolveDependencyPath(filePath: string, relativePath: string, { importMap = { imports: {} } }: { root?: string, importMap?: ImportMap } = {}) {
  const importMapPath = resolveWithImportMap(relativePath, importMap)
  
  const isUrl = isURL(importMapPath)
  const parentIsUrl = isURL(filePath)

  let resolvedPath: string
  if (isUrl) {
    resolvedPath = importMapPath
  } else if (isAbsolute(importMapPath) || relativePath !== importMapPath) {
    if (parentIsUrl) {
      const fileUrl = new URL(filePath)
      fileUrl.pathname = importMapPath
      resolvedPath = fileUrl.href
    } else {
      resolvedPath = importMapPath
    }
  } else {
    if (parentIsUrl) {
      const fileUrl = new URL(filePath)
      fileUrl.pathname = join(dirname(fileUrl.pathname), importMapPath)
      resolvedPath = fileUrl.href
    } else {
      resolvedPath = join(dirname(filePath), importMapPath)
    }
  }
  return resolvedPath
}