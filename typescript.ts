import { ts } from "./deps.ts"

export interface CompilerOptions {
  [key: string]: any
}

export function traverseTextFile(source: string, compilerOptions: CompilerOptions, receiver: (node: ts.Node) => ts.Node) {
  function transformer<T extends ts.Node>(): ts.TransformerFactory<T> {
    return (context: ts.TransformationContext) => {
      const visit: ts.Visitor = (node: ts.Node) => ts.visitEachChild(receiver(node), visit, context)
      return (node: ts.Node) => ts.visitNode(node, visit)
    }
  }

  const sourceFile = ts.createSourceFile("x.ts", source, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS)
  const result = ts.transform(sourceFile, [transformer()])
  const transformedNodes = result.transformed[0]
  const printer: ts.Printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: false })
  return printer.printNode(ts.EmitHint.SourceFile, transformedNodes, sourceFile)
}
