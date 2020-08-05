import { ts } from "./deps.ts"
import { fetchTextFile } from "./file.ts"

const compilerOptions = {
  target: "ESNext",
  module: "System",
}

export function instantiateString(path: string) {
  const __instantiate = ts.createCall(
    ts.createIdentifier("__instantiate"),
    undefined,
    [ts.createStringLiteral(path), ts.createIdentifier("false")],
  )
  const printer: ts.Printer = ts.createPrinter(
    { newLine: ts.NewLineKind.LineFeed, removeComments: false },
  )
  return printer.printNode(ts.EmitHint.Expression, __instantiate, undefined)
}

export async function systemLoaderString() {
  return await fetchTextFile(
    "https://raw.githubusercontent.com/denoland/deno/master/cli/system_loader.js",
  )
}


export function injectPath(path: string) {
  return (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      node.expression?.expression?.escapedText === "System" &&
      node.expression?.name?.escapedText === "register"
    ) {
      node.arguments = [ts.createLiteral(path), ...node.arguments]
    }
    return node
  }
}