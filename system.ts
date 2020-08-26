import { ts } from "./deps.ts";

const printer: ts.Printer = ts.createPrinter(
  { newLine: ts.NewLineKind.LineFeed, removeComments: false },
);

export function instantiateString(path: string) {
  const __exp = ts.createVariableStatement(
    undefined,
    ts.createVariableDeclarationList(
      [ts.createVariableDeclaration(
        ts.createIdentifier("__exp"),
        undefined,
        ts.createCall(
          ts.createIdentifier("__instantiate"),
          undefined,
          [
            ts.createStringLiteral(path),
            ts.createFalse(),
          ],
        ),
      )],
      ts.NodeFlags.Const,
    ),
  );
  return printer.printNode(ts.EmitHint.Unspecified, __exp, undefined);
}

export function exportString(key: string, value: string) {
  const statement = ts.createVariableStatement(
    [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.createVariableDeclarationList(
      [ts.createVariableDeclaration(
        ts.createIdentifier(key),
        undefined,
        ts.createElementAccess(
          ts.createIdentifier("__exp"),
          ts.createStringLiteral(value),
        ),
      )],
      ts.NodeFlags.Const,
    ),
  );

  return printer.printNode(ts.EmitHint.Unspecified, statement, undefined);
}

export function defaultExportString(value: string) {
  const assignment = ts.createExportAssignment(
    undefined,
    undefined,
    undefined,
    ts.createElementAccess(
      ts.createIdentifier("__exp"),
      ts.createStringLiteral(value),
    ),
  );
  return printer.printNode(ts.EmitHint.Unspecified, assignment, undefined);
}

export function createExportString(exports: string[]) {
  const exportStrings: string[] = [];
  for (const key of exports) {
    switch (key) {
      case "default": {
        exportStrings.push(defaultExportString(key));
        break;
      }
      default: {
        exportStrings.push(exportString(key, key));
        break;
      }
    }
  }
  return exportStrings.join(`\n`);
}

export async function systemLoaderString() {
  return await fetch(
    "https://raw.githubusercontent.com/denoland/deno/master/cli/system_loader.js",
  ).then((data) => data.text());
}

export function injectPath(specifier: string) {
  return (context: ts.TransformationContext) => {
    const visit: ts.Visitor = (node: ts.Node) => {
      if (
        ts.isCallExpression(node) &&
        node.expression?.expression?.escapedText === "System" &&
        node.expression?.name?.escapedText === "register"
      ) {
        node.arguments = [ts.createLiteral(specifier), ...node.arguments];
        return node;
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (node: ts.Node) => {
      return ts.visitNode(node, visit);
    };
  };
}
